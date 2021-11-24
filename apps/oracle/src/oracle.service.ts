import { Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { NlpManager, Language } from 'node-nlp';
import path from 'path';
import fs from 'fs-extra';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Key, Message, Source } from '@app/mongo';
import {
  CLEARANCE_LEVEL,
  delay,
  DISCORD_CORE,
  EXIT_CODES,
  IGuessLanguage,
  INerProcess,
  SOURCE_TYPE,
} from '@app/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { removeEmojis } from '@nlpjs/emoji';
import { Normalizer } from '@nlpjs/core';

// @ts-ignore
import Discord from 'v11-discord.js';



@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client;

  private commands: Discord.Collection<string, any> = new Discord.Collection();

  private hexID: string;

  private key: Key;

  private channel: Discord.Channel;

  private discordCore = DISCORD_CORE;

  private manager = new NlpManager({
    languages: ['ru', 'en'],
    threshold: 0.8,
    nlp: { log: true },
    forceNER: true
  });

  private normalizer = new Normalizer();

  private language = new Language();

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Message.name)
    private readonly MessagesModel: Model<Message>,
  ) { }

  private readonly logger = new Logger(
    OracleService.name, { timestamp: true },
  );

  async onApplicationBootstrap(): Promise<void> {

    this.client = new Discord.Client({
      ws: {
        large_threshold: 1000000,
        compress: true,
      }
    });

    let account = process.env.ACCOUNT;
    if (!account) account = 'free';

    await this.getKey(account);

    await this.loadNerEngine(Array.from(this.key.tags).includes('oracle'));

    await this.client.login(this.key.token);

    await this.getManagementChannel();

    this.logger.warn(`Key ${this.key.token} from ${account} has been taken!`);

    EXIT_CODES.forEach((eventType) =>
      process.on(eventType,  async () => {
        this.key.tags.pull('taken');
        this.key.tags.addToSet('free');

        await this.key.save();
        this.logger.warn(`Key ${this.key.token} from ${account} has been released!`);
      })
    );

    await this.oracle();
  }

  private async getKey(account: string): Promise<void> {
    this.key = await this.KeysModel.findOne({ tags: { $all: [ 'discord', account ] } });
    if (!this.key) throw new ServiceUnavailableException('Available keys not found!');

    this.hexID = BigInt(this.key._id).toString(16);

    this.key.tags.pull('free');
    this.key.tags.addToSet('taken');

    await this.key.save();
  }

  // TODO remove this shit out of here, only control can have it
  private async getManagementChannel(): Promise<void> {
    this.channel = await this.client.channels.find(
      (channel: Discord.Channel) =>
        channel.name && channel.guild.id === this.discordCore.id
        && channel.name === this.hexID
    );

    if (!this.channel) {
      // TODO error
      const guild = await this.client.guilds.get(this.discordCore.id);
      const channel = await guild.createChannel(this.hexID, {
        type: 'text'
        // TODO permissions
      });
      channel.setParent(DISCORD_CHANNEL_PARENTS.oraculum);
      this.channel = channel;
    }
  }

  private async loadNerEngine(init: boolean = false): Promise<void> {
    try {
      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const corpusPath = path.join(__dirname, '..', '..', '..', 'files', 'corpus.json');
      const corpusExists = fs.existsSync(corpusPath);

      if (!corpusExists) {
        throw new ServiceUnavailableException(`Corpus from: ${corpusPath} not found!`);
      }

      await this.manager.load(corpusPath);
    } catch (errorOrException) {
      this.logger.error(`loadNerEngine: ${errorOrException}`);
    }
  }

  private async oracle(): Promise<void> {
    try {

      this.client.on('message', async (message: Discord.Message) => {

        // TODO execute command only for clearance personal

        if (message.author.id === this.key._id) return;

        try {
          // TODO repost done, them management clearance
          if (message.channel.parentID === DISCORD_CHANNEL_PARENTS.files) {
            await message.delete();
            await message.channel.send(message.content);
          }

          // TODO execute command only for clearance personal
          // if (message.author.id === '240464611562881024') await message.send('My watch is eternal');
          await this.analyze(message);
        } catch (errorException) {
          this.logger.error(`Error: ${errorException}`);
        }
      });

      this.client.on('voiceStateUpdate', async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        // console.log(oldMember, newMember);
      });

      // TODO generate invites

      // TODO join servers

    /*
      for (const [guild_id] of this.client.guilds) {
        const guild = this.client.guilds.get(guild_id);
        const members = await guild.fetchMembers();
        console.log(members);
      }*/
    } catch (errorException) {
      this.logger.error(`bot: ${errorException}`);
    }
  }

  private async analyze(message: Discord.Message): Promise<void> {
    try {
      const emojisStage: string = removeEmojis(message.content);
      const normalizeStage: string = this.normalizer.normalize(emojisStage);
      const langStage: IGuessLanguage = this.language.guessBest(normalizeStage, ['en', 'ru']);

      const user = message.author;

      const information: INerProcess = await this.manager.process(langStage.alpha2, normalizeStage);

      if (information.entities.length > 0) {

        const tags: Set<string> = new Set([
          user.username,
          message.channel.name
        ]);

        const source: Partial<Source> = {
          type: SOURCE_TYPE.DiscordText,
          discord_author: user.username,
          discord_author_id: user.id,
          discord_channel_id: message.channel.id,
          discord_channel: message.channel.name
        };

        information.entities.forEach((entity) =>
          tags.add(entity.option.toLowerCase()
        ))

        if (message.channel.guild) {
          tags.add(message.channel.guild.name);
          source.discord_server = message.channel.guild.name;
          source.discord_server_id = message.channel.guild.id;
        }

        const discordMessage = new this.MessagesModel({
          context: message.content,
          clearance: [CLEARANCE_LEVEL.RED, CLEARANCE_LEVEL.A, CLEARANCE_LEVEL.ORACULUM],
          source,
          tags: Array.from(tags),
        });

        await discordMessage.save();
      }

      /**
       * Add every new account to database
       * and if we had a battle net connection
       *
       */
      const accountExists = await this.AccountModel.findOne({ discord_id: message.author.id });
      if (!accountExists) return;

      await delay(1);
      const userProfile = await user.fetchProfile();

      const account = new this.AccountModel({
        discord_id: [message.author.id],
        nickname: user.username,
        tags: [user.username],
      })

      if (userProfile.connections.size > 0) {
        for (const connection of userProfile.connections.values()) {
          if (connection.type === 'battlenet') {
            const battle_tag = connection.name;
            const [beforeHashTag] = connection.name.split('#');
            const tags: Set<string> = new Set();

            tags.add(beforeHashTag);
            tags.add(user.username);

            account.battle_tag = [battle_tag];
            account.nickname = beforeHashTag;
            account.tags = Array.from(tags);
          }
        }
      }

      await account.save();

    } catch (errorException) {
      this.logger.error(`analyze ${errorException}`);
    }
  }
}

import { Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { NlpManager } from 'node-nlp';
import path from 'path';
import fs from 'fs-extra';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Message } from '@app/mongo';
import { DISCORD_CHANNEL_LOGS, DISCORD_CHANNEL_PARENTS, DISCORD_CORE, EXIT_CODES } from '@app/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

// @ts-ignore
import Discord from 'v11-discord.js';


@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client;

  private commands: Discord.Collection<string, any>;

  private hexID: string;

  private key: Key;

  private channel: Discord.Channel;

  private manager = new NlpManager({
    languages: ['ru', 'en'],
    threshold: 0.8,
  });

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
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

    this.commands = new Discord.Collection();

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

    await this.bot();
  }

  private async getKey(account: string): Promise<void> {
    this.key = await this.KeysModel.findOne({ tags: { $all: [ 'discord', account ] } });
    if (!this.key) throw new ServiceUnavailableException('Available keys not found!');

    this.hexID = BigInt(this.key._id).toString(16);

    this.key.tags.pull('free');
    this.key.tags.addToSet('taken');

    await this.key.save();
  }

  private async getManagementChannel(): Promise<void> {
    this.channel = await this.client.channels.find(
      (channel: Discord.Channel) =>
        channel.name && channel.guild.id === DISCORD_CORE
        && channel.name === this.hexID
    );

    if (!this.channel) {
      const guild = await this.client.guilds.get(DISCORD_CORE);
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

      const corpus = fs.readFileSync(corpusPath, 'utf8');

      await this.manager.load(corpus);
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private async bot(): Promise<void> {
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
          // const match = await this.manager.extractEntities('ru', message.content);
          // console.log(match)
        } catch (errorException) {
          this.logger.error(`Error: ${errorException}`);
        }
      });

      this.client.on('voiceStateUpdate', async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        console.log(oldMember, newMember);
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
      this.logger.error(errorException);
    }
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Key, Message } from '@app/mongo';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Join } from './commands/join';
import { OracleCommandInterface } from './interface';
import path from 'path';
import fs from 'fs-extra';
import { Normalizer } from '@nlpjs/core';
import { removeEmojis } from '@nlpjs/emoji';
import { NlpManager, Language } from 'node-nlp';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  CLEARANCE_LEVEL, delay,
  DISCORD_REDIS_KEYS, ENTITY_NAME,
  EXIT_CODES,
  IGuessLanguage,
  INerProcess,
  ORACULUM_CLEARANCE,
  ORACULUM_CORE_ID,
  SOURCE_TYPE,
} from '@app/core';

// @ts-ignore
import Discord from 'v11-discord.js';

@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client;

  private commands: Discord.Collection<string, OracleCommandInterface> = new Discord.Collection();

  private hexID: string;

  private key: Key;

  private channel: Discord.Channel;

  private guild: Discord.Guild;

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

    await this.setCommands();

    await this.loadNerEngine();

    await this.client.login(this.key.token);

    await this.loadCoreGuild();

    await this.getOracleChannel(this.guild);

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

  /**
   * @description - Load CORE guild for ORACULUM network
   * @private
   */
  private async loadCoreGuild(): Promise<void> {
    const guild: Discord.Guild | undefined = await this.client.guilds.get(ORACULUM_CORE_ID);

    if (!guild) throw new NotFoundException('Discord Core Server not found!');

    this.guild = guild;
  }

  /**
   * @description - Find selected key in CMNW-DB and initiate oracle
   * @param account - Search query for selected oracle account in CMNW-DB
   * @private
   */
  private async getKey(account: string): Promise<void> {
    this.key = await this.KeysModel.findOne({ tags: { $all: [ 'discord', account ] } });
    if (!this.key) throw new ServiceUnavailableException('Available keys not found!');

    this.hexID = BigInt(this.key._id).toString(16);

    await this.redisService.set(`${DISCORD_REDIS_KEYS.SERVER}:${DISCORD_REDIS_KEYS.USER}#${this.key._id}`, this.key._id);

    this.key.tags.pull('free');
    this.key.tags.addToSet('taken');

    await this.key.save();
  }

  /**
   * @description - Fetch oracule management channel from CORE guild
   * @param guild - CORE guild discord entity
   * @private
   */
  private async getOracleChannel(guild: Discord.Guild): Promise<void> {
    this.channel = await guild.channels.find(
      (channel: Discord.Channel) =>
        channel.name && channel.guild.id === ORACULUM_CORE_ID
        && channel.name === this.hexID
    );

    if (!this.channel) this.logger.error(`Channel ${this.hexID} not found!`);
  }

  /**
   * @description - Oracule Main Thread
   * @private
   */
  private async oracle(): Promise<void> {
    try {

      /**
       * @description Trigger on every message
       * @param message - Discord.Message0,0
       */
      this.client.on('message', async (message: Discord.Message) => {

        const isOraculum = !!await this.redisService.exists(`${DISCORD_REDIS_KEYS.SERVER}:${DISCORD_REDIS_KEYS.USER}#${this.key._id}`) || false;

        // if message is posted by self or another oracle or bot
        if (
          message.author.id === this.key._id
          || message.author.bot
          || isOraculum
        ) return;

        try {

          // if we are at home server
          if (message.guild.id === ORACULUM_CORE_ID) {
            const mirror = await this.redisService.sismember(`${DISCORD_REDIS_KEYS.MIRROR}`, message.channel.parentID);

            // mirror messages only for discord clearance channels and for M oracle
            if (mirror && Array.from(this.key.tags).includes('management')) {
              await message.delete();
              await message.channel.send(message.content);
            } else if (this.channel && message.channel.id === this.channel.id) {
              // execute command only for clearance personal redis
              const commandClearance = await this.redisService.smembers(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.Commands}`);

              if (commandClearance.includes(message.author.id)) {
                const [commandName, args] = message.content.split(/(?<=^\S+)\s/);

                const command: OracleCommandInterface =
                  this.commands.get(commandName) ||
                  this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

                if (!command) return;

                if (command.guildOnly && message.channel.type !== 'text') {
                  return message.reply('I can\'t execute DM command');
                }

                await command.execute(message, args, this.client, this.redisService);
              }
            } else {
              await this.analyzeText(message);
            }
          } else {
            await this.analyzeText(message);
          }
        } catch (errorException) {
          this.logger.error(`Error: ${errorException}`);
        }
      });

      // TODO watch for voice channel statuses
      // this.client.on('voiceStateUpdate', async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        // console.log(oldMember, newMember);
      // });

    } catch (errorException) {
      this.logger.error(`bot: ${errorException}`);
    }
  }

  /**
   * @description Load NER engine for event or message recognition
   * @private
   */
  private async loadNerEngine(): Promise<void> {
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

  /**
   * @description Analyze text for entity recognition
   * @param message - Discord.Message
   * @private
   */
  private async analyzeText(
    message: Discord.Message,
  ): Promise<void> {
    try {

      const emojisStage: string = removeEmojis(message.content);
      const normalizeStage: string = this.normalizer.normalize(emojisStage);
      const langStage: IGuessLanguage = this.language.guessBest(normalizeStage, ['en', 'ru']);
      const analyzeText: INerProcess = await this.manager.process(langStage.alpha2, normalizeStage);

      const user: Discord.User = message.author;

      if (analyzeText.entities.length > 0) {
        // TODO oracle can sent message TO FLOW. ACCESS!
        await this.sendText(message, analyzeText);

        const discordMessage = new this.MessagesModel({
          context: message.content,
          clearance: [CLEARANCE_LEVEL.RED, CLEARANCE_LEVEL.A, CLEARANCE_LEVEL.ORACULUM],
          source: {
            message_type: SOURCE_TYPE.DiscordText,
            discord_author: `${user.username}#${user.discriminator}`,
            discord_author_id: user.id,
            discord_channel_id: message.channel.id,
            discord_channel: message.channel.name
          },
          tags: [
            user.username,
            message.channel.name
          ],
        });

        analyzeText.entities.forEach((entity) =>
          discordMessage.tags.addToSet(entity.option.toLowerCase())
        );

        if (message.guild) {
          discordMessage.tags.addToSet(message.guild.name);
          discordMessage.source.discord_server = message.guild.name;
          discordMessage.source.discord_server_id = message.guild.id;
        }

        await discordMessage.save();
      }

      await this.createUser(user);
    } catch (errorException) {
      this.logger.error(`analyzeText: ${errorException}`);
    }
  }

  private formatMarkdown(text: string): string {
    return `\`\`\`md\n${text}\n\`\`\``;
  }

  /**
   * @description Send Markdown text to selected & FLOW channel
   * @param message - Discord.Message
   * @param analyzeText - Entity recognition result
   * @private
   */
  private async sendText(
    message: Discord.Message,
    analyzeText: INerProcess
  ): Promise<string> {
    try {
      let text: string = analyzeText.utterance;

      const author = `# Author: ${message.author.username}#${message.author.discriminator} (${message.author.id})\n`;
      const channel = `# Channel: ${message.channel.name} (${message.channel.id})\n`;
      const guild = `# Server: ${message.guild.name} (${message.guild.id})\n`;

      analyzeText.entities.reverse().forEach(
        entity => text = `${text.substring(0, entity.start)}[${entity.utteranceText}](${entity.entity})${text.substring(entity.end + 1)}`
      );

      text = `${author}${channel}${guild}\n${text}`;

      const flowId = await this.redisService.get(`${DISCORD_REDIS_KEYS.CHANNEL}:flow`);

      if (flowId) {
        throw new NotFoundException('FlowID not found');
      }

      const flowChannel = await this.guild.channels.get(flowId) as Discord.TextChannel;
      if (!flowChannel) {
        throw new NotFoundException('Flow channel not found');
      }

      if (text.length < 2000) {
        await flowChannel.send(this.formatMarkdown(text));

        await lastValueFrom(
          from(analyzeText.entities).pipe(
            mergeMap(async (entity) => {
              if (entity.entity === ENTITY_NAME.Person) {
                const account = await this.AccountModel.findOne({ tags: entity.option });
                if (account && account.oraculum_id) {
                  const fileChannel = await this.guild.channels.get(account.oraculum_id) as Discord.TextChannel;
                  if (fileChannel) await fileChannel.send(this.formatMarkdown(text));
                }
              }
            })
          )
        );
      } else {
        const
          firstText = text.slice(0, 1999),
          secondText = text.slice(1999);

        await flowChannel.send(this.formatMarkdown(firstText));
        await flowChannel.send(this.formatMarkdown(secondText));
      }

      return text;
    } catch (errorException) {
      this.logger.error(`sendMarkdownText ${errorException}`);
    }
  }

  /**
   * @description - Add every new account to database & check connections for battle.net
   * @param user - Discord.User context
   * @private
   */
  private async createUser(user: Discord.User): Promise<void> {
    try {
      const accountExists = await this.AccountModel.findOne({ discord_id: user.id });
      if (!accountExists) return;

      const account = new this.AccountModel({
        discord_id: user.id,
        nickname: user.username,
        tags: [user.username],
      });

      await delay(1);
      const userProfile = await user.fetchProfile();

      if (userProfile.connections.size > 0) {
        for (const connection of userProfile.connections.values()) {
          if (connection.type === 'battlenet') {
            const battle_tag = connection.name;
            const [beforeHashTag] = connection.name.split('#');
            const tags: Set<string> = new Set();

            tags.add(beforeHashTag);
            tags.add(user.username);

            account.battle_tag = battle_tag;
            account.nickname = beforeHashTag;
            account.tags = Array.from(tags);
          }
        }
      }

      await account.save();
    } catch (errorException) {
      this.logger.error(`createUser ${errorException}`);
    }
  }

  /**
   * @description - Add commands for ORACLE client
   * @private
   */
  private async setCommands(): Promise<void> {
    this.commands.set(Join.name, Join);
  }
}

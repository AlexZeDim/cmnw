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
import { IQMessages, OracleCommandInterface } from './interface';
import { Queue } from 'bullmq';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import {
  delay,
  DISCORD_REDIS_KEYS,
  EXIT_CODES,
  messagesQueue,
  ORACULUM_CLEARANCE,
  ORACULUM_CORE_ID,
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

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Message.name)
    private readonly MessagesModel: Model<Message>,
    @BullQueueInject(messagesQueue.name)
    private readonly queue: Queue<IQMessages, void>,
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
       * @param message - Discord.Message
       */
      this.client.on('message', async (message: Discord.Message) => {

        // if message is posted by self or another oracle or bot
        const isOraculum = !!await this.redisService.exists(`${DISCORD_REDIS_KEYS.SERVER}:${DISCORD_REDIS_KEYS.USER}#${message.author.id}`) || false;
        if (
          message.author.id === this.key._id
          || message.author.bot
          || isOraculum
        ) return;

        try {
          // if we are at home server
          if (message.guild.id === ORACULUM_CORE_ID) {
            // mirror messages only for discord clearance channels and for M oracle
            const mirror = await this.redisService.sismember(`${DISCORD_REDIS_KEYS.MIRROR}`, message.channel.parentID);
            if (mirror && Array.from(this.key.tags).includes('management')) {
              await message.delete();
              await message.channel.send(message.content);
              return;
            }

            // if message channel is management channel
            if (this.channel && message.channel.id === this.channel.id) {
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
            }
            // TODO if operations
          } else {
            await this.queue.add(
              message.id,
              {
                message: {
                  id: message.id,
                  text: message.content,
                },
                author: {
                  id: message.author.id,
                  username: message.author.username,
                  discriminator: message.author.discriminator,
                },
                channel: {
                  id: message.channel.id,
                  name: message.channel.name,
                  source_type: message.channel.type,
                },
                guild: {
                  id: message.guild.id,
                  name: message.guild.name,
                }
              }, {
                jobId: message.id
              }
            );
            await this.createUser(message.author);
          }
        } catch (errorException) {
          this.logger.error(`onMessage: ${errorException}`);
        }
      });

      /**
       * @description Trigger every voice leave or join event
       * @param oldMember - Discord.GuildMember
       * @param newMember - Discord.GuildMember
       */
      this.client.on('voiceStateUpdate', async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        try {
          const snowflake = Discord.SnowflakeUtil.generate();

          let channel: Discord.VoiceChannel;
          let channelId: Discord.Snowflake;
          let member: Discord.GuildMember = oldMember;
          let text: string = 'leave or join';
          let voiceChannelStatus: string;

          if (oldMember.voiceChannelID === null && newMember.voiceChannelID) {
            // join
            channelId = newMember.voiceChannelID;
            member = newMember;
            // TODO probably fetch require testing fetch
            channel = member.guild.channels.get(channelId);
            // TODO require tests
            const members: Discord.GuildMember[] = channel.members.array();
            if (members.length) {
              voiceChannelStatus = `\nVoice Channel status:\n${members.map(m => ` - ${m.user.name}#${m.user.discriminator}`).join('\n')}`
            }
            text = `${member.user.name}#${member.user.discriminator} joins to channel ${channel.name} ${voiceChannelStatus ? voiceChannelStatus : ''}`;
          } else if (oldMember.voiceChannelID && newMember.voiceChannelID == null) {
            // leave
            channelId = oldMember.voiceChannelID;
            member = oldMember;
            channel = member.guild.channels.get(channelId);
            const members: Discord.GuildMember[] = channel.members.array();
            if (members.length) {
              voiceChannelStatus = `\nVoice Channel status:\n${members.map(m => ` - ${m.user.name}#${m.user.discriminator}`).join('\n')}`
            }
            text = `${member.user.name}#${member.user.discriminator} joins to channel ${channel.name} ${voiceChannelStatus ? voiceChannelStatus : ''}`;
          }

          await this.queue.add(
            snowflake,
            {
              message: {
                id: snowflake,
                text,
              },
              author: {
                id: member.user.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
              },
              channel: {
                id: channelId,
                name: channel.name,
                source_type: channel.type,
              },
              guild: {
                id: member.guild.id,
                name: member.guild.name,
              }
            }, {
              jobId: snowflake
            }
          );
        } catch (errorOrException) {
          this.logger.error(`Error: ${errorOrException}`);
        }
      });

    } catch (errorException) {
      this.logger.error(`voiceStateUpdate: ${errorException}`);
    }
  };

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
            const battleTag = connection.name;
            const [beforeHashTag] = connection.name.split('#');
            const tags: Set<string> = new Set();

            tags.add(beforeHashTag);
            tags.add(user.username);

            account.battle_tag = battleTag;
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

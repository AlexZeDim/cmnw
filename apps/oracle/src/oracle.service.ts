import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Key } from '@app/mongo';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Join } from './commands/join';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { IQMessages, OracleCommandInterface } from './interface';
import {
  EXIT_CODES,
  messagesQueue,
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

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
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

    const guild: Discord.Guild | undefined = await this.client.guilds.get(ORACULUM_CORE_ID);

    if (!guild) throw new NotFoundException('Discord Core Server not found!');

    await this.getOracleChannel(guild);

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

  private async getOracleChannel(guild: Discord.Guild): Promise<void> {

    this.channel = await guild.channels.find(
      (channel: Discord.Channel) =>
        channel.name && channel.guild.id === ORACULUM_CORE_ID
        && channel.name === this.hexID
    );

    if (!this.channel) this.logger.error(`Channel ${this.hexID} not found!`);
  }

  private async oracle(): Promise<void> {
    try {

      this.client.on('message', async (message: Discord.Message) => {

        // if message is posted by self or another bot
        // TODO optional check is another oraculum member?
        if (message.author.id === this.key._id || message.author.bot) return;

        try {

          // if we are at home server
          if (message.guild.id === ORACULUM_CORE_ID) {
            const mirror = await this.redisService.sismember('discord:mirror', message.channel.parentID);

            // mirror messages only for discord clearance channels and for M oracle
            if (!!mirror && Array.from(this.key.tags).includes('management')) {
              await message.delete();
              await message.channel.send(message.content);
            } else if (this.channel && message.channel.id === this.channel.id) {
              // FIXME execute command only for clearance personal redis
              const account = await this.AccountModel.findOne({ discord_id: message.author.id }).lean();

              if (account && account.clearance.includes('a')) {
                const [commandName, args] = message.content.split(/(?<=^\S+)\s/);

                const command: OracleCommandInterface =
                  this.client.commands.get(commandName) ||
                  this.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

                if (!command) return;

                if (command.guildOnly && message.channel.type !== 'text') {
                  return message.reply('I can\'t execute DM command');
                }

                await command.execute(message, args, this.client, this.redisService);
              }
            } else {
              await this.queue.add(
                message.id,
                {
                  client: this.client,
                  message: message,
                },
                {
                  jobId: message.id
                }
              );
            }
          } else {
            await this.queue.add(
              message.id,
              {
                client: this.client,
                message: message,
              },
              {
                jobId: message.id
              }
            );
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

  private async setCommands(): Promise<void> {
    this.commands.set(Join.name, Join);
  }
}

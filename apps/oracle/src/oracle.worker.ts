import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import {
  CLEARANCE_LEVEL,
  delay,
  DISCORD_REDIS_KEYS,
  ENTITY_NAME,
  IGuessLanguage,
  INerProcess,
  messagesQueue,
  SOURCE_TYPE,
} from '@app/core';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Message, Source } from '@app/mongo';
import { Model } from 'mongoose';
import { Normalizer } from '@nlpjs/core';
import { removeEmojis } from '@nlpjs/emoji';
import { NlpManager, Language } from 'node-nlp';
import { Job } from 'bullmq';
import path from 'path';
import fs from 'fs-extra';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { IQMessages } from './interface';

// @ts-ignore
import Discord from 'v11-discord.js';

@BullWorker({ queueName: messagesQueue.name, options: messagesQueue.workerOptions })
export class OracleWorker {
  private readonly logger = new Logger(
    OracleWorker.name, { timestamp: true },
  );

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
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Message.name)
    private readonly MessagesModel: Model<Message>,
  ) { }

  @BullWorkerProcess(messagesQueue.workerOptions)
  private async process(job: Job<IQMessages, boolean>): Promise<boolean> {
    try {
      await this.loadNerEngine();
      await job.updateProgress(1);

      const { message, author, channel, guild }: IQMessages = { ...job.data };

      const emojisStage: string = removeEmojis(message);
      await job.updateProgress(5);

      const normalizeStage: string = this.normalizer.normalize(emojisStage);
      await job.updateProgress(10);

      const langStage: IGuessLanguage = this.language.guessBest(normalizeStage, ['en', 'ru']);
      await job.updateProgress(15);

      const analyzeText: INerProcess = await this.manager.process(langStage.alpha2, normalizeStage);
      await job.updateProgress(50);

      if (analyzeText.entities.length > 0) {
        const context = await this.sendMarkdownText({ message, author, channel, guild }, analyzeText);

        const discordMessage = new this.MessagesModel({
          context,
          clearance: [CLEARANCE_LEVEL.RED, CLEARANCE_LEVEL.A, CLEARANCE_LEVEL.ORACULUM],
          source: {
            message_type: SOURCE_TYPE.DiscordText,
            discord_author: `${author.username}#${author.discriminator}`,
            discord_author_id: author.id,
            discord_channel_id: channel.id,
            discord_channel: channel.name
          },
          tags: [
            author.username,
            channel.name
          ],
        });

        analyzeText.entities.forEach((entity) =>
          discordMessage.tags.addToSet(entity.option.toLowerCase())
        );

        if (guild) {
          discordMessage.tags.addToSet(guild.name);
          discordMessage.source.discord_server = guild.name;
          discordMessage.source.discord_server_id = guild.id;
        }

        await discordMessage.save();
        await job.updateProgress(100);
        return true;
      }
      return false;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`analyze ${errorException}`);
      return false;
    }
  }

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

  private async sendMarkdownText(
    message: IQMessages,
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

      text = `\`\`\`md\n${author}${channel}${guild}${text}\n\`\`\``;

      // FIXME post message larger then
      if (text.length < 2000) {
        const flowId = await this.redisService.get(`${DISCORD_REDIS_KEYS.CHANNEL}:flow`);

        console.log(flowId);
        console.log(text);
/*        if (flowId) {
          const flowChannel = await client.channels.get(flowId) as Discord.TextChannel;
          if (flowChannel) await flowChannel.send(text);
        }

        await lastValueFrom(
          from(analyzeText.entities).pipe(
            mergeMap(async (entity) => {
              if (entity.entity === ENTITY_NAME.Person) {
                const account = await this.AccountModel.findOne({ tags: entity.option });
                if (account && account.oraculum_id) {
                  const fileChannel = await client.channels.get(account.oraculum_id) as Discord.TextChannel;
                  if (fileChannel) await fileChannel.send(text);
                }
              }
            })
          )
        );*/
      }

      return text;
    } catch (errorException) {
      this.logger.error(`sendMarkdownText ${errorException}`);
    }
  }
  /**
   * Add every new account to database
   * and if we had a battle net connection
   * TODO return on decorator
   */
  private async createUser(user: Discord.User): Promise<void> {
    try {
      const accountExists = await this.AccountModel.findOne({ discord_id: user.id });
      if (!accountExists) return;

      await delay(1);
      const userProfile = await user.fetchProfile();

      const account = new this.AccountModel({
        discord_id: user.id,
        nickname: user.username,
        tags: [user.username],
      });

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
}

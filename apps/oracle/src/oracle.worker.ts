import {
  CLEARANCE_LEVEL,
  deliveryQueue,
  DISCORD_REDIS_KEYS,
  ENTITY_NAME,
  IGuessLanguage,
  INerProcess,
  IQDelivery,
  messagesQueue,
} from '@app/core';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { BullQueueInject, BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Normalizer } from '@nlpjs/core';
import { removeEmojis } from '@nlpjs/emoji';
import { NlpManager, Language } from 'node-nlp';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from '@app/mongo';
import { Model } from 'mongoose';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Job, Queue } from 'bullmq';
import { ELASTIC_INDEX_ENUM, MessagesIndex } from '@app/elastic';
import { IQMessages } from './interface';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import path from 'path';
import fs from 'fs-extra';

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
    forceNER: true,
  });

  private normalizer = new Normalizer();

  private language = new Language();

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @BullQueueInject(deliveryQueue.name)
    private readonly queue: Queue<IQDelivery, void>,
    private readonly elasticsearchService: ElasticsearchService
  ) { }

  @BullWorkerProcess(messagesQueue.workerOptions)
  private async process(job: Job<IQMessages, void>): Promise<void> {
    try {
      await this.loadNerEngine();
      await job.updateProgress(1);

      const messageQueue: IQMessages = { ...job.data };
      await job.updateProgress(5);

      const emojisStage: string = removeEmojis(messageQueue.message.text);
      await job.updateProgress(10);

      const normalizeStage: string = this.normalizer.normalize(emojisStage);
      await job.updateProgress(15);

      const langStage: IGuessLanguage = this.language.guessBest(normalizeStage, ['en', 'ru']);
      await job.updateProgress(20);

      const analyzeText: INerProcess = await this.manager.process(langStage.alpha2, normalizeStage);
      await job.updateProgress(50);

      if (!analyzeText.entities.length) {
        this.logger.log('No entities found');
        return void 0;
      }

      let text: string = analyzeText.utterance;

      const author = `# Author: ${messageQueue.author.username}#${messageQueue.author.discriminator} (${messageQueue.author.id})\n`;
      const channel = `# Channel: ${messageQueue.channel.name} (${messageQueue.channel.id})\n`;
      const guild = `# Server: ${messageQueue.guild.name} (${messageQueue.guild.id})\n`;
      await job.updateProgress(55);

      const flowId = await this.redisService.get(`${DISCORD_REDIS_KEYS.CHANNEL}:flow`);
      if (!flowId) {
        this.logger.error(`Flow channel not found`);
        return void 0;
      }

      const channelsId: string[] = [flowId];

      await lastValueFrom(
        from(analyzeText.entities.reverse()).pipe(
          mergeMap(async (entity) => {
            try {
              // format Markdown text
              text = `${text.substring(0, entity.start)}[${entity.utteranceText}](${entity.entity})${text.substring(entity.end + 1)}`;
              // channel Id for personal files
              if (entity.entity === ENTITY_NAME.Person) {
                const account = await this.AccountModel.findOne({ tags: entity.option });
                if (account && account.oraculum_id) {
                  channelsId.push(account.oraculum_id);
                }
              }

            } catch (errorException) {
              this.logger.error(`Account ${entity.option} ${errorException}`);
            }
          })
        )
      )

      text = `${author}${channel}${guild}\n${text}`;
      await job.updateProgress(60);

      const entity = MessagesIndex.createFromModel({
        snowflake: messageQueue.message.id,
        source_type: messageQueue.channel.source_type,
        discord_author: `${messageQueue.author.username}#${messageQueue.author.discriminator}`,
        discord_author_snowflake: messageQueue.author.id,
        discord_channel: messageQueue.channel.name,
        discord_channel_snowflake: messageQueue.channel.id,
        tags: [
          messageQueue.channel.name,
          `${messageQueue.author.username}#${messageQueue.author.discriminator}`
        ],
        clearance: [CLEARANCE_LEVEL.RED, CLEARANCE_LEVEL.A, CLEARANCE_LEVEL.ORACULUM],
        text: messageQueue.message.text,
        discord_text: text,
      });

      if (messageQueue.guild) {
        entity.tags.push(messageQueue.guild.name);
        entity.discord_server = messageQueue.guild.name;
        entity.discord_server_snowflake = messageQueue.guild.id;
      }

      if (analyzeText.entities.length) {
        analyzeText.entities.forEach((entityNer) => {
          if (entityNer.option) {
            entity.tags.push(entityNer.option.toLowerCase())
          }
        });
      }

      await job.updateProgress(65);
      await this.elasticsearchService.index({
        index: ELASTIC_INDEX_ENUM.MESSAGES,
        body: entity,
      });

      await job.updateProgress(95);

      await this.queue.add(
        messageQueue.message.id,
        {
          text,
          channelsId
        }, {
          jobId: messageQueue.message.id
        }
      )
      await job.updateProgress(100);
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${messagesQueue.name}: ${errorException}`);
    }
  };

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
}

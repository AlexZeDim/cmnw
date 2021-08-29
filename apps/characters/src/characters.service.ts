import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { CharacterQI, charactersQueue, GLOBAL_OSINT_KEY, OSINT_SOURCE } from '@app/core';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(
    CharactersService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<CharacterQI, number>,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexCharacters(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const jobs: number = await this.queue.count();
      if (jobs > 10000) {
        this.logger.warn(`indexCharacters: ${jobs} jobs found`);
        return;
      }

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        this.logger.warn(`indexCharacters: ${keys.length} keys found`);
        return;
      }

      let i: number = 0;
      let iteration: number = 0;

      await this.CharacterModel
        .find()
        .sort({ hash_b: 1 })
        .limit(250000)
        .cursor()
        .eachAsync(async (character: Character) => {
          const [name, realm] = character._id.split('@');
          await this.queue.add(
            character._id,
            {
              _id: character._id,
              name: name,
              realm: realm,
              region: 'eu',
              clientId: keys[i]._id,
              clientSecret: keys[i].secret,
              accessToken: keys[i].token,
              updated_by: OSINT_SOURCE.INDEXCHARACTER,
              guildRank: false,
              createOnlyUnique: false,
              forceUpdate: 43200000,
              iteration: iteration
            },
            {
              jobId: character._id,
              priority: 5,
            },
          );
          i++;
          iteration++;
          if (i >= keys.length) i = 0;
        }, { parallel: 50 });
    } catch (errorException) {
      this.logger.error(`indexCharacters: ${errorException}`)
    }
  }
}

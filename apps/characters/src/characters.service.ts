import {
  CharacterJobQueue,
  charactersQueue,
  getKeys,
  GLOBAL_OSINT_KEY,
  OSINT_CHARACTER_LIMIT,
  OSINT_SOURCE,
} from '@app/core';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionIdOrName } from 'blizzapi';
import ms from 'ms';

@Injectable()
export class CharactersService implements OnApplicationBootstrap {
  private offset = 0;
  private keyEntities: KeysEntity[];
  private readonly logger = new Logger(CharactersService.name, {
    timestamp: true,
  });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap() {
    await this.indexCharactersFromMongo(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexCharactersFromMongo(
    clearance: string = GLOBAL_OSINT_KEY,
  ): Promise<void> {
    try {
      const jobs: number = await this.queue.count();
      if (jobs > 10000) {
        throw new Error(`${jobs} jobs found`);
      }

      let characterIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance);

      let length = this.keyEntities.length;

      await this.CharacterModel.find<Character>()
        .sort({ hash_b: 1 })
        .skip(this.offset)
        .limit(OSINT_CHARACTER_LIMIT)
        .cursor({ batchSize: 5000 })
        .eachAsync(
          async (character) => {
            const { client, secret, token } =
              this.keyEntities[characterIteration % length];

            const characterJobArgs = {
              guid: character._id,
              id: character.id,
              name: character.name,
              realmId: <number>character.realm_id,
              realmName: character.realm_name,
              realm: character.realm,
              guild: character.guild,
              guildId: character.guild_guid,
              guidGuid: character.guild_id,
              guildRank: character.guild_rank,
              hashA: character.hash_a,
              hashB: character.hash_b,
              race: character.race,
              class: character.character_class,
              specialization: character.active_spec,
              gender: character.gender,
              faction: character.faction,
              level: character.level,
              achievementPoints: character.achievement_points,
              averageItemLevel: character.average_item_level,
              equippedItemLevel: character.equipped_item_level,
              mountsNumber: character.mounts_score,
              petsNumber: character.pets_score,
              lastModified: character.last_modified,
              region: <RegionIdOrName>'eu',
              clientId: client,
              clientSecret: secret,
              accessToken: token,
              createdBy: OSINT_SOURCE.CHARACTER_INDEX,
              updatedBy: OSINT_SOURCE.CHARACTER_INDEX,
              requestGuildRank: false,
              createOnlyUnique: false,
              forceUpdate: ms('12h'),
              iteration: characterIteration,
            };

            await this.queue.add(character._id, characterJobArgs, {
              jobId: character._id,
              priority: 5,
            });

            characterIteration = characterIteration + 1;
            const isKeyRequest = characterIteration % 1000 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          },
          { parallel: 50 },
        );

      this.offset = this.offset + OSINT_CHARACTER_LIMIT;
    } catch (errorOrException) {
      this.logger.error(`indexCharactersFromMongo ${errorOrException}`);
    }
  }
}

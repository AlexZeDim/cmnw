import {
  CharacterJobQueue,
  charactersQueue,
  getKeys,
  GLOBAL_OSINT_KEY,
  OSINT_CHARACTER_LIMIT,
  OSINT_SOURCE,
} from '@app/core';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CharactersEntity, KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionIdOrName } from 'blizzapi';
import { from, lastValueFrom, mergeMap } from 'rxjs';
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
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap() {
    await this.indexCharacters(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async indexCharacters(
    clearance: string = GLOBAL_OSINT_KEY,
  ): Promise<void> {
    try {
      const jobs = await this.queue.count();
      if (jobs > 10000) {
        throw new Error(`${jobs} jobs found`);
      }

      let characterIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance, false, true);

      let length = this.keyEntities.length;

      const characters = await this.charactersRepository.find({
        order: { hashB: 'ASC' },
        take: OSINT_CHARACTER_LIMIT,
        skip: this.offset,
      });

      this.offset = this.offset + OSINT_CHARACTER_LIMIT;

      await lastValueFrom(
        from(characters).pipe(
          mergeMap(async (character) => {
            const { client, secret, token } =
              this.keyEntities[characterIteration % length];

            const characterJobArgs = {
              ...character,
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

            await this.queue.add(character.guid, characterJobArgs, {
              jobId: character.guid,
              priority: 5,
            });

            characterIteration = characterIteration + 1;
            const isKeyRequest = characterIteration % 1000 == 0;
            if (isKeyRequest) {
              this.keyEntities = await getKeys(this.keysRepository, clearance);
              length = this.keyEntities.length;
            }
          }, 10),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(`indexCharacters ${errorOrException}`);
    }
  }
}

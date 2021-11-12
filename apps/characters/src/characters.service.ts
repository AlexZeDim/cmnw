import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { IQCharacter, charactersQueue, GLOBAL_OSINT_KEY, OSINT_SOURCE, MYTHIC_PLUS_SEASONS, FACTION } from '@app/core';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlizzAPI } from 'blizzapi';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import ms from 'ms';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(
    CharactersService.name, { timestamp: true },
  );

  private BNet: BlizzAPI

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<IQCharacter, number>,
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
        throw new NotFoundException(`${keys.length} keys found`);
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
              forceUpdate: ms('12h'),
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

  @Cron(CronExpression.EVERY_WEEKEND)
  async indexMythicPlusLadder(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast: boolean = true
  ): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      const [key] = keys;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      const mythicPlusDungeons: Map<number, string> = new Map([]);
      const mythicPlusSeasons: Set<number> = new Set();
      const mythicPlusExpansionWeeks: Set<number> = new Set();

      const { dungeons } = await this.BNet.query('/data/wow/mythic-keystone/dungeon/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      const { seasons } = await this.BNet.query('/data/wow/mythic-keystone/season/index', {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      dungeons.map(dungeon => mythicPlusDungeons.set(dungeon.id, dungeon.name.en_GB));
      seasons.map(season => mythicPlusSeasons.add(season.id));
      const lastSeason = Array.from(mythicPlusSeasons).pop();

      for (const mythicPlusSeason of mythicPlusSeasons.values()) {

        if (mythicPlusSeason < MYTHIC_PLUS_SEASONS.SHDW_S1) continue;
        if (onlyLast && mythicPlusSeason !== lastSeason) continue;

        const { periods } = await this.BNet.query(`/data/wow/mythic-keystone/season/${mythicPlusSeason}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'dynamic-eu' }
        });

        if (onlyLast) {
          const lastWeek = periods[periods.length - 1];
          mythicPlusExpansionWeeks.add(lastWeek.id);
        } else {
          periods.map(period => mythicPlusExpansionWeeks.add(period.id));
        }
      }

      const w = Array.from(mythicPlusExpansionWeeks).pop();
      const previousWeek = await this.redisService.get(`week:${w}`);
      if (previousWeek) {
        throw new RuntimeException(`week:${w} already been requested`);
      }

      const connectedRealmsIDs = await this.RealmModel.distinct('connected_realm_id');
      let iteration = 0;

      for (const connectedRealmId of connectedRealmsIDs) {
        for (const dungeonId of mythicPlusDungeons.keys()) {
          // SHDW Dungeons Breakpoint
          if (dungeonId < 375) continue;
          for (const period of mythicPlusExpansionWeeks.values()) {
            const { leading_groups } = await this.BNet.query(`/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${period}`, {
              timeout: 10000,
              headers: { 'Battlenet-Namespace': 'dynamic-eu' }
            });

            for (const group of leading_groups) {
              for (const member of group.members) {

                const _id = `${member.profile.name}@${member.profile.realm.slug}`;
                const faction = member.faction.type === 'HORDE' ? FACTION.H : FACTION.A;
                iteration += 1;

                await this.queue.add(
                  _id,
                  {
                    _id,
                    name: member.profile.name,
                    realm: member.profile.realm.slug,
                    forceUpdate: ms('4h'),
                    region: 'eu',
                    clientId: key._id,
                    clientSecret: key.secret,
                    accessToken: key.token,
                    created_by: OSINT_SOURCE.MYTHICPLUS,
                    updated_by: OSINT_SOURCE.MYTHICPLUS,
                    faction,
                    iteration,
                    guildRank: false,
                    createOnlyUnique: false,
                  },
                  {
                    jobId: _id,
                    priority: 3
                  }
                );
              }
            }
          }
        }
      }

      await this.redisService.set(`week:${w}`, iteration);
    } catch (errorException) {
      this.logger.error(`indexMythicPlusLadder: ${errorException}`)
    }
  }
}

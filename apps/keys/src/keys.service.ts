import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { keysConfig } from '@app/configuration';
import { join } from 'path';
import { readFileSync } from 'fs';
import { IKey } from '@app/configuration/interfaces/key.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { ArrayContains, Repository } from 'typeorm';
import {
  BlizzardApiKeys,
  GLOBAL_BLIZZARD_KEY,
  GLOBAL_WCL_KEY_V2,
  IWarcraftLogsToken,
  KEY_LOCK_ERRORS_NUM,
  KEY_STATUS,
} from '@app/core';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeysService.name, { timestamp: true });

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.initKeys();
    await this.indexWarcraftLogsKeys();
    await this.indexBlizzardKeys();
  }

  private async initKeys(): Promise<void> {
    const keysJson = readFileSync(
      join(__dirname, '..', '..', '..', keysConfig.path),
      'utf8',
    );
    const { keys } = JSON.parse(keysJson);

    await lastValueFrom(
      from(keys).pipe(
        mergeMap(async (key: IKey) => {
          let keyEntity = await this.keysRepository.findOneBy({
            client: key.client,
          });
          if (!keyEntity) {
            keyEntity = this.keysRepository.create(key);
            await this.keysRepository.save(keyEntity);
          }
        }, 5),
      ),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexBlizzardKeys(): Promise<void> {
    try {
      const now = DateTime.now();
      const keysEntity = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_BLIZZARD_KEY]),
      });

      for (const keyEntity of keysEntity) {
        const isResetErrorsCount =
          keyEntity.status != KEY_STATUS.FREE &&
          keyEntity.resetAt &&
          DateTime.fromJSDate(keyEntity.resetAt) < now;

        if (isResetErrorsCount) {
          keyEntity.resetAt = now.toJSDate();
          keyEntity.errorCounts = 0;
          keyEntity.status = KEY_STATUS.FREE;
        }

        const isTooManyErrors =
          keyEntity.errorCounts > KEY_LOCK_ERRORS_NUM &&
          Boolean(keyEntity.status != KEY_STATUS.TOO_MANY_REQUESTS);

        if (isTooManyErrors) {
          keyEntity.status = KEY_STATUS.TOO_MANY_REQUESTS;
          keyEntity.resetAt = now.plus({ hour: 2 }).toJSDate();
        }

        const { data } = await this.httpService.axiosRef.request<BlizzardApiKeys>({
          url: 'https://eu.battle.net/oauth/token',
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: {
            grant_type: 'client_credentials',
          },
          auth: {
            username: keyEntity.client,
            password: keyEntity.secret,
          },
        });

        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;
        this.logger.log(`Updated: key ${keyEntity.client}`);

        await this.keysRepository.save(keyEntity);
      }
    } catch (errorOrException) {
      this.logger.error(`indexBlizzardKeys: ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexWarcraftLogsKeys(): Promise<void> {
    try {
      const keyEntities = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_WCL_KEY_V2, 'v2']),
      });

      for (const keyEntity of keyEntities) {
        const { data } = await this.httpService.axiosRef.request<
          Partial<IWarcraftLogsToken>
        >({
          method: 'post',
          url: 'https://www.warcraftlogs.com/oauth/token',
          data: {
            grant_type: 'client_credentials',
          },
          auth: {
            username: keyEntity.client,
            password: keyEntity.secret,
          },
        });

        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;

        await this.keysRepository.save(keyEntity);
        this.logger.log(`Updated: key ${keyEntity.client}`);
      }
    } catch (errorOrException) {
      this.logger.error(`indexWarcraftLogsKeys: ${errorOrException}`);
    }
  }
}

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { keysConfig } from '@app/configuration';
import { join } from 'path';
import { readFileSync } from 'fs';
import { IKey } from '@app/configuration/interfaces/key.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GLOBAL_BLIZZARD_KEY, GLOBAL_WCL_KEY, IWarcraftLogsToken } from '@app/core';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { ArrayContains, In, Repository } from "typeorm";

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
      const keyEntities = await this.keysRepository.findBy({
        tags: ArrayContains([GLOBAL_BLIZZARD_KEY]),
      });

      for (const keyEntity of keyEntities) {
        const { data } = await this.httpService.axiosRef.request<any>({
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
        this.logger.log(`Updated: key(${keyEntity.client})`);

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
        tags: ArrayContains([GLOBAL_WCL_KEY, 'gql']),
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
            username: '947f1d2f-0ea7-434d-8856-37b6786e2cf9',
            password: 'iqpacAIt8ds3qfOhVn3gTakbvqumlMgLJqV6bsrb',
          },
        });

        keyEntity.token = data.access_token;
        keyEntity.expiredIn = data.expires_in;
        this.logger.log(`Updated: key(${keyEntity.client})`);

        await this.keysRepository.save(keyEntity);
      }
    } catch (errorOrException) {
      this.logger.error(`indexWarcraftLogsKeys: ${errorOrException}`);
    }
  }
}

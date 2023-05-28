import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Key } from '@app/mongo';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { keysConfig } from '@app/configuration';
import { join } from 'path';
import { readFileSync } from 'fs';
import { IKey } from '@app/configuration/interfaces/key.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GLOBAL_BLIZZARD_KEY, IWarcraftLogsToken } from '@app/core';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom, mergeMap } from 'rxjs';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    KeysService.name, { timestamp: true },
  );

  constructor(
    private httpService: HttpService,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.initKeys();
    await this.indexBlizzardKeys();
  }

  private async initKeys(): Promise<void> {
    const keysJson = readFileSync(join(__dirname, '..', '..', '..', keysConfig.path), 'utf8');
    const { keys } = JSON.parse(keysJson);

    await lastValueFrom(
      from(keys).pipe(
        mergeMap(async (key: IKey) => {
          const keyExists = await this.KeysModel.findById(key._id);
          if (!keyExists) {
            await this.KeysModel.create(key);
            this.logger.log(`Created: key(${key._id})`);
          }
        }, 5),
      ),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexBlizzardKeys(): Promise<void> {
    await this.KeysModel
      .find({ tags: GLOBAL_BLIZZARD_KEY })
      .cursor()
      .eachAsync(async (key): Promise<void> => {
        if (key.secret) {
          const { data } = await  this.httpService.axiosRef.request<any>({
            url: 'https://eu.battle.net/oauth/token',
            method: 'post',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            params: {
              grant_type: 'client_credentials',
            },
            auth: {
              username: key._id,
              password: key.secret,
            },
          });
          if (data && data.access_token && data.expires_in) {
            key.token = data.access_token;
            key.expiresIn = data.expires_in;
            await key.save();
            this.logger.log(`Updated: key(${key._id})`);
          }
        }
      });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexWarcraftLogsKeys(): Promise<void> {
    await this.KeysModel
      .find({ tags: { $in: [ 'warcraftlogs', 'gql' ] } })
      .cursor()
      .eachAsync(async (key): Promise<void> => {
        const { data } = await
        this.httpService.axiosRef.request<Partial<IWarcraftLogsToken>>({
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
        if (data.access_token && data.expires_in) {
          key.token = data.access_token;
          key.expiresIn = data.expires_in;
          await key.save();
          this.logger.log(`Updated: key(${key._id})`);
        }
      });
  }
}

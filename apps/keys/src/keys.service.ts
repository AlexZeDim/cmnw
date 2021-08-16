import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Key } from '@app/mongo';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { keysConfig } from '@app/configuration';
import axios from 'axios';
import { join } from 'path';
import { readFileSync } from 'fs';
import { KeyInterface } from '@app/configuration/interfaces/key.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GLOBAL_BLIZZARD_KEY } from '@app/core';

@Injectable()
export class KeysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    KeysService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.initKeys();
    await this.indexKeys();
  }

  private async initKeys(): Promise<void> {
    const keysJson = readFileSync(join(__dirname, '..', '..', '..', keysConfig.path), 'utf8');
    const { keys } = JSON.parse(keysJson);
    await Promise.all(
      keys.map(async (key: KeyInterface) => {
        const keyExists = await this.KeysModel.findById(key._id);
        if (!keyExists) {
          await this.KeysModel.create(key);
          this.logger.log(`Created: key(${key._id})`);
        }
      }),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async indexKeys(): Promise<void> {
    await this.KeysModel
      .find({ tags: GLOBAL_BLIZZARD_KEY })
      .cursor()
      .eachAsync(async (key: Key): Promise<void> => {
        if (key.secret) {
          const { data } = await axios({
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
          if (data && 'access_token' in data && 'expires_in' in data) {
            key.token = data.access_token;
            key.expired_in = data.expires_in;
            await key.save();
            this.logger.log(`Updated: key(${key._id})`);
          }
        }
      });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import BlizzAPI from 'blizzapi';
import { GLOBAL_KEY, round2 } from '@app/core';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Token } from '@app/mongo';
import { Model } from "mongoose";
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WowtokenService {
  private readonly logger = new Logger(
    WowtokenService.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Token.name)
    private readonly TokenModel: Model<Token>,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
  ) {
    this.indexTokens(GLOBAL_KEY);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexTokens(clearance: string): Promise<void> {
    try {
      const key = await this.KeysModel.findOne({ tags: clearance });
      if (!key) return

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      //TODO it is capable to implement if-modified-since header
      const { last_updated_timestamp, price, lastModified } = await this.BNet.query(`/data/wow/token/index`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      })

      const wowtoken = await this.TokenModel.findById(last_updated_timestamp);

      if (!wowtoken) {
        await this.TokenModel.create({
          _id: last_updated_timestamp,
          region: 'eu',
          price: round2(price / 10000),
          last_modified: lastModified,
        })
      }
    } catch (e) {
      this.logger.error(`${WowtokenService.name}: ${e}`)
    }
  }
}

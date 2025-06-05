import { Injectable, Logger } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import { BlizzAPI } from '@alexzedim/blizzapi';
import { API_HEADERS_ENUM, apiConstParams, getKeys, getRandomProxy, GLOBAL_PROXY_V4 } from '@app/core';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';

@Injectable()
export class TestsCore {
  private readonly logger = new Logger(TestsCore.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) { }

  async getRandomProxy(): Promise<any> {
    return await getKeys(this.keysRepository, GLOBAL_PROXY_V4, true, false);
  }

  async requestWithRandomProxy(
    nameSlug: string,
    realmSlug: string,
  ): Promise<any> {
    let result: any;

    try {
      const httpsAgent = await getRandomProxy(this.keysRepository);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: cmnwConfig.clientId,
        clientSecret: cmnwConfig.clientSecret,
        httpsAgent,
      });

      result = await this.BNet.query(
        `/data/wow/guild/${realmSlug}/${nameSlug}`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );
      console.log(this.BNet);
    } catch (errorOrException) {
      result = errorOrException;
    }

    return result;
  }
}

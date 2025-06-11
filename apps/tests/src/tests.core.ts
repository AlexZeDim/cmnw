import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { cmnwConfig } from '@app/configuration';
import { BlizzAPI } from '@alexzedim/blizzapi';
import {
  API_HEADERS_ENUM,
  apiConstParams,
  getKey,
  getKeys,
  getRandomProxy,
  GLOBAL_PROXY_V4, GLOBAL_WCL_KEY_V1,
  GLOBAL_WCL_KEY_V2,
} from '@app/resources';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';

@Injectable()
export class TestsCore implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsCore.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
  ) { }

  async onApplicationBootstrap() {
    await this.logs('Aanzz', 'Aanzz');
  }

  async logs(nameSlug: string, realmSlug: string): Promise<any> {
    try {
      this.logger.log(`${nameSlug}:${realmSlug}`);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: cmnwConfig.clientId,
        clientSecret: cmnwConfig.clientSecret,
      });

      return await this.BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/logs`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );
    } catch (errorOrException) {
      this.logger.error({ context: 'logs', guid: 'guid', error: JSON.stringify(errorOrException) });
      return errorOrException;
    }
  }

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
    } catch (errorOrException) {
      result = errorOrException;
    }

    return result;
  }

  async getWclKeys() {
    const keyV1 = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V1);
    const keysV1 = await getKeys(this.keysRepository, GLOBAL_WCL_KEY_V1);
    const keyV2 = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V2);
    const keysV2 = await getKeys(this.keysRepository, GLOBAL_WCL_KEY_V2);

    return [keyV1, keysV1, keyV2, keysV2 ];
  }
}

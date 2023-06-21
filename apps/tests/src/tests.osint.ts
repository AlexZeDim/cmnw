import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { dynamicParams, profileParams } from '@app/e2e/params';
import { BlizzardApiResponse } from '@app/core';
import { commonwealthConfig } from '@app/configuration';

@Injectable()
export class TestsOsint implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestsOsint.name, { timestamp: true });

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: commonwealthConfig.clientId,
    clientSecret: commonwealthConfig.clientSecret,
    validateAccessTokenOnEachQuery: true,
  });

  async onApplicationBootstrap() {
    const token = await this.BNet.getAccessToken();
    this.logger.warn(`getAccessToken: ${token}`);
  }

  async realm(realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(`/data/wow/realm/${realmSlug}`, dynamicParams);
  }

  async connectedRealm(connectedRealmId: number): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/data/wow/connected-realm/${connectedRealmId}`,
      dynamicParams,
    );
  }

  async summary(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${nameSlug}`,
      profileParams,
    );
  }

  async status(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
      profileParams,
    );
  }

  async mounts(characterName: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`,
      profileParams,
    );
  }

  async pets(characterName: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/pets`,
      profileParams,
    );
  }

  async professions(
    characterName: string,
    realmSlug: string,
  ): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/professions`,
      profileParams,
    );
  }

  async guild(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/data/wow/guild/${realmSlug}/${nameSlug}`,
      profileParams,
    );
  }
  async guildRoster(nameSlug: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/data/wow/guild/${realmSlug}/${nameSlug}/roster`,
      profileParams,
    );
  }
}

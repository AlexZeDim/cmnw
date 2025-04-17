import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { API_HEADERS_ENUM, apiConstParams, BlizzardApiResponse } from '@app/core';
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
    return this.BNet.query(
      `/data/wow/realm/${realmSlug}`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async connectedRealm(connectedRealmId: number): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/data/wow/connected-realm/${connectedRealmId}`,
      apiConstParams(API_HEADERS_ENUM.DYNAMIC),
    );
  }

  async summary(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${nameSlug}`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async status(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async mounts(characterName: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async pets(characterName: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/collections/pets`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async professions(
    characterName: string,
    realmSlug: string,
  ): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/profile/wow/character/${realmSlug}/${characterName}/professions`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async guild(nameSlug: string, realmSlug: string): Promise<BlizzardApiResponse> {
    return this.BNet.query(
      `/data/wow/guild/${realmSlug}/${nameSlug}`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }

  async guildRoster(nameSlug: string, realmSlug: string): Promise<any> {
    return this.BNet.query(
      `/data/wow/guild/${realmSlug}/${nameSlug}/roster`,
      apiConstParams(API_HEADERS_ENUM.PROFILE),
    );
  }
}

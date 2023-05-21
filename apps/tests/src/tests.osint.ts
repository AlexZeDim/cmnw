import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { profileParams } from '@app/e2e/params';

@Injectable()
export class TestsOsint {
  private readonly logger = new Logger(
    TestsOsint.name, { timestamp: true },
  );

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: '',
    clientSecret: '',
    accessToken: '',
  });

  async summary(nameSlug: string, realmSlug: string) {
    return this.BNet.query(`/profile/wow/character/${realmSlug}/${nameSlug}`, profileParams);
  }

  async status(nameSlug: string, realmSlug: string) {
    return this.BNet.query(`/profile/wow/character/${realmSlug}/${nameSlug}/status`, profileParams);
  }

  async mounts(characterName: string, realmSlug: string) {
    return this.BNet.query(`/profile/wow/character/${realmSlug}/${characterName}/collections/mounts`, profileParams);
  }

  async pets(characterName: string, realmSlug: string) {
    return this.BNet.query(`/profile/wow/character/${realmSlug}/${characterName}/collections/pets`, profileParams);
  }

  async professions(characterName: string, realmSlug: string) {
    return this.BNet.query(`/profile/wow/character/${realmSlug}/${characterName}/professions`, profileParams);
  }

  async guild(nameSlug: string, realmSlug: string) {
    return this.BNet.query(`/data/wow/guild/${realmSlug}/${nameSlug}`, profileParams);
  }

}

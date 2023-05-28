import { Injectable, Logger } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { profileParams } from '@app/e2e';

@Injectable()
export class TestsOsint {
  private readonly logger = new Logger(
    TestsOsint.name, { timestamp: true },
  );

  private BNet: BlizzAPI = new BlizzAPI({
    region: 'eu',
    clientId: '',
    clientSecret: '',
    accessToken: ''
  })

  async summary(nameSlug: string, realmSlug: string) {
    return await this.BNet.query(`/profile/wow/character/${realmSlug}/${nameSlug}`, profileParams);
  }
}

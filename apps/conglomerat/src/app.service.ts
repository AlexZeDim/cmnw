import { Injectable } from '@nestjs/common';
import { CharacterQueueOsintService } from '@app/character-queue-osint';
import { RealmQueueOsintService } from '@app/realm-queue-osint';

@Injectable()
export class AppService {
  constructor(
    private readonly queueCharacters: CharacterQueueOsintService,
    private readonly queueRealms: RealmQueueOsintService,
  ) {
    this.test('test');
  }

  async test(input: string): Promise<void> {
    await this.queueRealms.addJob(input);
  }
}

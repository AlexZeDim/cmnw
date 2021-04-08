import { Injectable } from '@nestjs/common';
import { CharacterQueueOsintService } from '@app/character-queue-osint';

@Injectable()
export class AppService {
  constructor(
    private readonly queueCharacters: CharacterQueueOsintService,
  ) {
    this.test('test');
  }

  async test (input: string): Promise<void> {
    await this.queueCharacters.addJob(input)
  }
}

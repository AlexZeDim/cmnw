import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';

@Injectable()
export class CharacterQueueOsintService {

  private readonly logger = new Logger(
    CharacterQueueOsintService.name, true,
  );

  constructor(@BullQueueInject(queueCharacters.name) public readonly queue: Queue) {}

  public async addJob(input: string): Promise<Job> {
    this.logger.debug('job added!')
    return this.queue.add("job", { test: input });
  }
}

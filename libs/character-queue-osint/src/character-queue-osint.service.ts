import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';

@Injectable()
export class CharacterQueueOsintService {
  constructor(@BullQueueInject(queueCharacters.name) public readonly queue: Queue) {}

  public async addJob(): Promise<Job> {
    return this.queue.add("job", { test: "test" });
  }
}

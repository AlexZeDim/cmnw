import { Logger, Module } from '@nestjs/common';
import { CharacterQueueOsintService } from './character-queue-osint.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';
// TODO probably add connection to redis
@Module({
  imports: [BullModule.registerQueue(queueCharacters.name)],
  providers: [CharacterQueueOsintService, Logger],
  exports: [CharacterQueueOsintService],
})
export class CharacterQueueOsintModule {}

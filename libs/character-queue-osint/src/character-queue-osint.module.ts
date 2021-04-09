import { Logger, Module } from '@nestjs/common';
import { CharacterQueueOsintService } from './character-queue-osint.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';

@Module({
  imports: [BullModule.registerQueue(queueCharacters.name)],
  providers: [CharacterQueueOsintService, Logger],
  exports: [CharacterQueueOsintService],
})
export class CharacterQueueOsintModule {}

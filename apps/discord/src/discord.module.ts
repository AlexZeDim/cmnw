import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';

@Module({
  imports: [],
  controllers: [],
  providers: [DiscordService],
})
export class DiscordModule {}

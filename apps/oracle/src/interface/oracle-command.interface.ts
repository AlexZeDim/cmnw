// @ts-ignore
import Discord from 'v11-discord.js';
import { Redis } from '@nestjs-modules/ioredis';

export interface OracleCommandInterface {
  readonly name: string;
  readonly guildOnly: boolean;
  execute(
    message: Discord.Message,
    args: string,
    client: Discord.Client,
    redis: Redis,
  ): Promise<void>
}

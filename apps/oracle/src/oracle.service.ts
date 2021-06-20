import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
// @ts-ignore
import Discord from 'discord-agent';

@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client

  private commands: Discord.Collection<string, any>

  private readonly logger = new Logger(
    OracleService.name, true,
  );

  getHello(): string {
    return 'Hello World!';
  }

  async onApplicationBootstrap(): Promise<void> {
    this.client = new Discord.Client();
    this.commands = new Discord.Collection();
  }
}

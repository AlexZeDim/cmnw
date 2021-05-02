import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import * as Discord from 'discord.js';
import { discordConfig } from '@app/configuration';

@Injectable()
export class DiscordService implements OnApplicationBootstrap {
  private client: Discord.Client

  onApplicationBootstrap(): void {
    this.client = new Discord.Client();
    this.client.login(discordConfig.token);
    this.test()
  }

  test(): void {
    this.client.on('message', msg => {
      if (msg.content === 'ping') {
        msg.reply('Pong!');
      }
    })
  }
}

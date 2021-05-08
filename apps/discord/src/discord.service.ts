import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as Discord from 'discord.js';
import { discordConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from "path";

@Injectable()
export class DiscordService implements OnApplicationBootstrap {
  private client: Discord.Client

  private commands: Discord.Collection<string, any>

  private readonly logger = new Logger(
    DiscordService.name, true,
  );

  async onApplicationBootstrap(): Promise<void> {
    this.client = new Discord.Client();
    this.commands = new Discord.Collection();
    this.loadCommands()
    await this.client.login(discordConfig.token);
    this.bot()
  }

  bot(): void {
    this.client.on('ready', () => this.logger.log(`Logged in as ${this.client.user.tag}!`))
    this.client.on('message', async message => {
      if (message.author.bot) return;

      const [commandName, args] = message.content.split(/(?<=^\S+)\s/);

      const command =
        this.commands.get(commandName) ||
        this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) return;

      if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply("I can't execute that command inside DMs!");
      }

      try {
        command.execute(message, args, this.client);
      } catch (error) {
        this.logger.error(error);
        await message.reply('There was an error trying to execute that command!');
      }
    })
  }

  loadCommands(): void {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/discord/src/commands/'))
      .filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      this.commands.set(command.name, command);
    }
  }
}

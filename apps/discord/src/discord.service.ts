import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { discordConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Subscription } from '@app/mongo';
import { Model } from 'mongoose';
import { IDiscordCommand } from '@app/core';
import Discord, { Intents, Interaction } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

@Injectable()
export class DiscordService implements OnApplicationBootstrap {
  private client: Discord.Client

  private intents = new Intents(32767);

  private commandsMessage: Discord.Collection<string, IDiscordCommand> = new Discord.Collection();

  private commandSlash = [];

  private readonly rest = new REST({ version: '9' }).setToken(discordConfig.token);

  private readonly logger = new Logger(
    DiscordService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Subscription.name)
    private readonly SubscriptionModel: Model<Subscription>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {

    this.loadCommands();

    await this.rest.put(
      Routes.applicationGuildCommands(discordConfig.id, '734001595049705534'),
      { body: this.commandSlash },
    );

    this.logger.log('Reloaded application (/) commands.');

    this.client = new Discord.Client({ intents: this.intents });

    await this.client.login(discordConfig.token);

    this.bot()
  }

  private bot(): void {
    this.client.on('ready', (): void => this.logger.log(`Logged in as ${this.client.user.tag}!`));

    this.client.on('messageCreate', async (message): Promise<void> => {
      if (message.author.bot) return;

      const [commandName, args] = message.content.split(/(?<=^\S+)\s/);

      const command =
        this.commandsMessage.get(commandName) ||
        this.commandsMessage.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) return;

      if (command.slashOnly || command.inDevelopment) return;

      if (command.guildOnly && message.channel.type !== 'GUILD_TEXT') {
        await message.reply('This command can be executed only in guild channel');
        return;
      }

      try {
        await command.executeMessage(message, args, this.client);
      } catch (error) {
        this.logger.error(error);
        await message.reply('There was an error trying to execute that command!');
      }
    });

    this.client.on('interactionCreate', async (interaction: Interaction): Promise<void> => {
      if (!interaction.isCommand()) return;

      const command = this.commandsMessage.get(interaction.commandName);
      if (!command) return;

      if (command.inDevelopment) {
        await interaction.reply({ content: 'This command is still in development mode or disabled', ephemeral: true });
        return;
      }

      try {
        await command.executeInteraction(interaction, this.client);
      } catch (error) {
        this.logger.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    })
  }

  private loadCommands(): void {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/discord/src/commands/'))
      .filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const command: IDiscordCommand = require(`./commands/${file}`);
      this.commandsMessage.set(command.name, command);
      this.commandSlash.push(command.slashCommand.toJSON());
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async subscriptions(): Promise<void> {
    await this.SubscriptionModel
      .aggregate([
        {
          $sort: { timestamp: 1 }
        },
        {
          $lookup: {
            from: 'realms',
            localField: 'realms._id',
            foreignField: 'connected_realm_id',
            as: 'realms',
          },
        },
        {
          $lookup: {
            from: 'items',
            localField: 'items',
            foreignField: '_id',
            as: 'items',
          },
        },
      ])
      .cursor({ batchSize: 10 })
  }
}

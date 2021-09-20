import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { discordConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Subscription } from '@app/mongo';
import { Model } from 'mongoose';
import { IDiscordCommand, LFG, NOTIFICATIONS } from '@app/core';
import { CandidateEmbedMessage } from './embeds';
import Discord, { Channel, Intents, Interaction, TextChannel } from 'discord.js';
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

    await this.rest.put(
      Routes.applicationGuildCommands(discordConfig.id, '734001595049705534'),
      { body: this.commandSlash },
    );

    this.logger.log('Reloaded application (/) commands.');

    this.client = new Discord.Client({ intents: this.intents });

    this.loadCommands();

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

      if (command.guildOnly && message.channel.type !== 'GUILD_TEXT') {
        await message.reply("I can't execute that command at this channel");
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
      .eachAsync(async (subscription): Promise<void> => {
        try {
          const channel: Channel = this.client.channels.cache.get(subscription.channel_id);
          /**
           * Fault Tolerance
           */
          if (!channel || channel.type !== 'GUILD_TEXT') {
            if (subscription.tolerance > 100) {
              this.logger.warn(`subscriptions: discord ${subscription.discord_name}(${subscription.discord_id}) tolerance: ${subscription.tolerance} remove: true`);
              await this.SubscriptionModel.findOneAndRemove(
              { discord_id: subscription.disconnect, channel_id: subscription.channel_id }
              );
            } else {
              this.logger.warn(`subscriptions: discord ${subscription.discord_name}(${subscription.discord_id}) tolerance: ${subscription.tolerance}+1`);
              await this.SubscriptionModel.findOneAndUpdate(
                { discord_id: subscription.disconnect, channel_id: subscription.channel_id },
                { tolerance: subscription.tolerance + 1 }
              );
            }

            return;
          }
          /**
           * Recruiting
           */
          if (subscription.type === NOTIFICATIONS.RECRUITING) {
            this.logger.log(`subscriptions: discord ${subscription.discord_name}(${subscription.discord_id}) recruiting`);
            const query = { looking_for_guild: LFG.NEW };
            if (subscription.faction) Object.assign(query, { faction: subscription.faction });
            if (subscription.average_item_level) Object.assign(query, { average_item_level: { '$gte': subscription.average_item_level } });
            if (subscription.rio_score) Object.assign(query, { rio_score: { '$gte': subscription.rio_score } });
            if (subscription.days_from) Object.assign(query, { days_from: { '$gte': subscription.days_from } });
            if (subscription.days_to) Object.assign(query, { days_to: { '$lte': subscription.days_to } });
            if (subscription.character_class.length) Object.assign(query, { character_class : { '$in': subscription.character_class } });
            if (subscription.wcl_percentile) Object.assign(query, { wcl_percentile: { '$gte': subscription.wcl_percentile } });
            if (subscription.languages.length) Object.assign(query, { languages : { '$in': subscription.languages } });
            subscription.realms.map(async (realm) => {
              Object.assign(query, { realm: realm.slug });
              const characters = await this.CharacterModel.find(query).lean();
              if (characters.length) {
                characters.map(character => {
                  const candidate = CandidateEmbedMessage(character, realm);
                  (channel as TextChannel).send({ embeds: [candidate] });
                });
              }
            });
          }
          await this.SubscriptionModel.findOneAndUpdate(
          { discord_id: subscription.discord_id, channel_id: subscription.channel_id },
          { timestamp: new Date().getTime() }
          );
        } catch (errorException) {
          this.logger.error(`subscriptions: ${errorException}`);
        }
      });
  }
}

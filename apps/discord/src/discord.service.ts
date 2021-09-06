import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as Discord from 'discord.js';
import { discordConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from "path";
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Subscription } from '@app/mongo';
import { Model } from "mongoose";
import { LFG, NOTIFICATIONS } from '@app/core';
import { CandidateEmbedMessage } from './embeds';
import { TextChannel } from 'discord.js';

@Injectable()
export class DiscordService implements OnApplicationBootstrap {
  private client: Discord.Client

  private commands: Discord.Collection<string, any>

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
    this.client = new Discord.Client();
    this.commands = new Discord.Collection();
    this.loadCommands()
    await this.client.login(discordConfig.token);
    this.bot()
  }

  private bot(): void {
    this.client.on('ready', () => this.logger.log(`Logged in as ${this.client.user.tag}!`))
    this.client.on('message', async message => {
      if (message.author.bot) return;

      const [commandName, args] = message.content.split(/(?<=^\S+)\s/);

      const command =
        this.commands.get(commandName) ||
        this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) return;

      if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply("I can't execute that command at this channel");
      }

      try {
        command.execute(message, args, this.client);
      } catch (error) {
        this.logger.error(error);
        await message.reply('There was an error trying to execute that command!');
      }
    })
  }

  private loadCommands(): void {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/discord/src/commands/'))
      .filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      this.commands.set(command.name, command);
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
      .exec()
      .eachAsync(async (subscription) => {
        try {
          const channel = this.client.channels.cache.get(subscription.channel_id);
          /**
           * Fault Tolerance
           */
          if (!channel || channel.type !== "text") {
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
                  (channel as TextChannel).send(candidate);
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

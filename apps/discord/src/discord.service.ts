import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { discordConfig } from '@app/configuration';
import fs from 'fs-extra';
import path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Character, Item, Realm, Subscription } from '@app/mongo';
import { FilterQuery, Model } from 'mongoose';
import { IAAuctionOrders, IDiscordCommand, LFG, NOTIFICATIONS } from '@app/core';
import Discord, { Intents, Interaction, TextChannel } from 'discord.js';
import { differenceBy } from 'lodash';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { CandidateEmbedMessage } from './embeds';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { createMessageLine } from './utils/createMessageLine';
import { MarketEmbed } from './embeds/market.embed';

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
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Realm.name)
    private readonly RealmsModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
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
        await interaction.reply({ content: 'This command is still in development mode & disabled', ephemeral: true });
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
      .find()
      .populate('items')
      .sort({ timestamp: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync(async (subscription): Promise<void> => {
        try {
          const channel = await this.client.channels.fetch(subscription.channel_id);

          if (!channel || channel.type !== 'GUILD_TEXT') throw new Error(`Unable to fetch channel: ${subscription.channel_id} guild: ${subscription.discord_name}`);

          switch (subscription.type) {
            case NOTIFICATIONS.INFO:
              break;
            case NOTIFICATIONS.CANCEL:
              break;
            case NOTIFICATIONS.CANDIDATES:

              const query: FilterQuery<Character> = { looking_for_guild: LFG.NEW };

              if (subscription.faction) Object.assign(query, { faction: subscription.faction });
              if (subscription.item_level) Object.assign(query, { average_item_level: { '$gte': subscription.item_level } });
              if (subscription.rio_score) Object.assign(query, { rio_score: { '$gte': subscription.rio_score } });
              if (subscription.days_from) Object.assign(query, { days_from: { '$gte': subscription.days_from } });
              if (subscription.days_to) Object.assign(query, { days_to: { '$lte': subscription.days_to } });
              if (subscription.character_class) Object.assign(query, { character_class: subscription.character_class });
              if (subscription.wcl_percentile) Object.assign(query, { wcl_percentile: { '$gte': subscription.wcl_percentile } });
              if (subscription.languages) Object.assign(query, { languages : subscription.languages });

              if (subscription.realms_connected.length) {
                const realms = subscription.realms_connected.map((realm) => realm.slug);
                Object.assign(query, { realm : { $in: realms } });
              }

              const characters = await this.CharacterModel.find(query).limit(50);

              if (characters.length) {
                characters.map(character => {
                  const candidateEmbed = CandidateEmbedMessage(character);
                  if (channel.type === 'GUILD_TEXT') (channel as TextChannel).send( { embeds: [candidateEmbed] });
                })
              }

              break;
            case NOTIFICATIONS.MARKET:
            case NOTIFICATIONS.ORDERS:

              if (subscription.items.length === 0) {
                throw new Error('No items detected');
              }

              const [connectedRealmHub] = subscription.realms_connected;

              const realm = await this.RealmsModel
                .findOne({ connected_realm_id: connectedRealmHub.connected_realm_id })
                .sort({ auctions: -1 });

              if (realm && realm.auctions > connectedRealmHub.auctions) {
                const itemsIDs: number[] = subscription.items.map(item => item instanceof Item ? item._id : item);

                await this.AuctionModel
                  .aggregate<IAAuctionOrders>([
                    {
                      $match: {
                        connected_realm_id: connectedRealmHub.connected_realm_id,
                        item_id: { $in: itemsIDs },
                        last_modified: { $in: [ connectedRealmHub.auctions, realm.auctions ] },
                      }
                    },
                    {
                      $group: {
                        _id: '$item_id',
                        orders_t0: {
                          $push: {
                            $cond: {
                              if: {
                                $eq: [ "$last_modified", connectedRealmHub.auctions ]
                              },
                              then: {
                                id: "$id",
                                quantity: "$quantity",
                                price: "$price",
                                bid: "$bid",
                                buyout: "$buyout",
                              },
                              else: "$$REMOVE"
                            }
                          }
                        },
                        orders_t1: {
                          $push: {
                            $cond: {
                              if: {
                                $eq: [ "$last_modified", realm.auctions ]
                              },
                              then: {
                                id: "$id",
                                quantity: "$quantity",
                                price: "$price",
                                bid: "$bid",
                                buyout: "$buyout",
                              },
                              else: "$$REMOVE"
                            }
                          }
                        }
                      }
                    }
                  ])
                  .allowDiskUse(true)
                  .cursor()
                  .eachAsync(async (auctionsOrders: IAAuctionOrders) => {

                    const created = differenceBy(auctionsOrders.orders_t0, auctionsOrders.orders_t1, 'id');
                    const removed = differenceBy(auctionsOrders.orders_t1, auctionsOrders.orders_t0, 'id');

                    const items = [...subscription.items];

                    let item = items.find(item => item instanceof Item ? item._id === auctionsOrders._id : item === auctionsOrders._id);

                    if (typeof item === 'number') {
                      item = await this.ItemModel.findById(auctionsOrders._id);
                    }

                    if (subscription.type === NOTIFICATIONS.ORDERS) {

                      let message: string = '';
                      let tradeHub: string = `${connectedRealmHub.connected_realm_id}`;

                      if (subscription.realms_connected.length < 3) {
                        tradeHub = Array.from(subscription.realms_connected).map(r => r.name_locale).join(', ');
                      }

                      if (created.length) {
                        await lastValueFrom(from(created).pipe(
                          mergeMap(async (order) => {
                            const line = createMessageLine(order, tradeHub, item);

                            if ((message.length + line.length) > 1999) {
                              await (channel as TextChannel).send({ content: message });
                              message = line;
                            } else {
                              message = message + line;
                            }
                          })
                        ));
                      }

                      if (removed.length) {
                        await lastValueFrom(from(removed).pipe(
                          mergeMap(async (order) => {
                            const line = createMessageLine(order, tradeHub, item);

                            if ((message.length + line.length) > 1999) {
                              await (channel as TextChannel).send({ content: message });
                              message = line;
                            } else {
                              message = message + line;
                            }
                          })
                        ));
                      }

                      if (message.length) await (channel as TextChannel).send({ content: message })
                    }

                    if (subscription.type === NOTIFICATIONS.MARKET) {
                      const marketEmbed = MarketEmbed(created, removed, connectedRealmHub, item);
                      await (channel as TextChannel).send({ embeds: [marketEmbed ]});
                    }
                  });

                subscription.realms_connected.map((connected_realm) => {
                  connected_realm.golds = realm.golds;
                  connected_realm.auctions = realm.auctions;
                  return connected_realm;
                });

                subscription.markModified('realms_connected');
              }

              break;
          }

          subscription.timestamp = new Date().getTime();
          await subscription.save();
        } catch (errorOrException) {

          if (subscription.tolerance === 100) {
            await this.SubscriptionModel.findByIdAndRemove(subscription._id);
          } else {
            subscription.tolerance = subscription.tolerance + 1;
            await subscription.save();
          }

          this.logger.error(`subscriptions: ${errorOrException}`);
        }
      }, { parallel: 10 });
  }
}

import { MessageEmbed } from 'discord.js';
import { IAAuctionOrder } from '@app/core';
import { Item } from '@app/mongo';
import { discordConfig } from '@app/configuration';
import { RealmConnected } from '@app/mongo/schemas/subscriptions.schema';

export function MarketEmbed(
  created: IAAuctionOrder[],
  removed: IAAuctionOrder[],
  realm: RealmConnected,
  item: Item,
): MessageEmbed {
  const embed = new MessageEmbed();
  try {

    const marketData = {
      createdQuantity: 0,
      createdOpenInterest: 0,
      removedQuantity: 0,
      removedOpenInterest: 0,
      changeOrders: 0,
      changeQuantity: 0,
      changeOpenInterest: 0,
    };

    let name: string;

    if (item.ticker) {
      name = item.ticker;
    } else if (item.name.en_GB) {
      name = item.name.en_GB.toUpperCase();
    } else {
      name = item._id.toString();
    }

    if (item.icon) embed.setThumbnail(item.icon);

    embed
      .setTitle(`${name}@${realm.connected_realm_id}`)
      .setURL(encodeURI(`${discordConfig.basename}/item/${name}@${realm.connected_realm_id}`))
      .setTimestamp(realm.auctions)
      .setFooter('CMNW | DMA');


    if (created.length) {
      Array
        .from(created)
        .forEach((order) => {
          marketData.createdQuantity += order.quantity;
          if (order.price) marketData.createdOpenInterest += order.quantity * order.price;
          if (order.buyout) {
            marketData.createdOpenInterest += order.buyout;
          } else if (order.bid) {
            marketData.createdOpenInterest += order.bid;
          }
        });

      embed.addField(
        '────── CREATED ──────',
        `Orders: ${created.length}\nQuantity: ${marketData.createdQuantity}\nOpen Interest: ${marketData.createdOpenInterest.toFixed(2)}g\n───────────────────`,
        false,
      );
    }

    if (removed.length) {
      Array
        .from(removed)
        .forEach((order) => {
          marketData.removedQuantity += order.quantity;
          if (order.price) marketData.removedOpenInterest += order.quantity * order.price;
          if (order.buyout) {
            marketData.removedOpenInterest += order.buyout;
          } else if (order.bid) {
            marketData.removedOpenInterest += order.bid;
          }
        });

      embed.addField(
        '────── CREATED ──────',
        `Orders: ${created.length}\nQuantity: ${marketData.removedQuantity}\nOpen Interest: ${marketData.removedOpenInterest.toFixed(2)}g\n───────────────────`,
        false,
      );
    }

    if (marketData.createdQuantity && marketData.removedQuantity) {
      marketData.changeOrders = created.length - removed.length;
      marketData.changeQuantity = marketData.createdQuantity - marketData.removedQuantity;
      marketData.changeOpenInterest = marketData.createdOpenInterest - marketData.removedOpenInterest;

      embed.addField(
        '────── CHANGED ──────',
        `Orders: ${marketData.changeOrders}\nQuantity: ${marketData.changeQuantity}\nInterest Diff: ${marketData.changeOpenInterest.toFixed(2)}g\n───────────────────`,
        false,
      );
    }

    return embed;
  } catch (errorException) {
    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell the @AlexZeDim2645 that there is an error in MarketEmbed', false);
    embed.setThumbnail('https://i.imgur.com/vraz5ML.png');
    return embed;
  }
}

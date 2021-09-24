import { LeanDocument } from 'mongoose';
import { Subscription } from '@app/mongo';
import { MessageEmbed } from 'discord.js';
import { NOTIFICATIONS } from '@app/core';

export function SearchEmbedMessage(subscription: LeanDocument<Subscription>): MessageEmbed {
  const embed = new MessageEmbed();
  try {
    embed.setAuthor(subscription.type.toUpperCase());

    embed.addFields(
      { name: 'Guild ID', value: String(subscription.discord_id), inline: true },
      { name: 'Guild Name', value: String(subscription.discord_name), inline: true },
      { name: '\u200B', value: '\u200B' },
      { name: 'Channel ID', value: String(subscription.channel_id), inline: true },
      { name: 'Channel Name', value: String(subscription.channel_name), inline: true },
      { name: '\u200B', value: '\u200B' },
    );

    if (subscription.type === NOTIFICATIONS.CANDIDATES) {
      if (subscription.faction) embed.addField('Faction', subscription.faction, true);
      if (subscription.character_class) embed.addField('Class', subscription.character_class, true);
      if (subscription.days_from) embed.addField('Raid Days From', String(subscription.days_from), true);
      if (subscription.days_to) embed.addField('Raid Days To', String(subscription.days_to), true);
      if (subscription.item_level) embed.addField('Item Level', String(subscription.item_level), true);
      if (subscription.rio_score) embed.addField('Raider IO Score', String(subscription.rio_score), true);
      if (subscription.wcl_percentile) embed.addField('WCL Mythic %', String(subscription.wcl_percentile), true);
      if (subscription.languages) embed.addField('Speaking Language', subscription.languages, true);

      if (subscription.realms_connected.length === 0) {
        embed.addField('Realms', 'Across EU Region', true);
      } else if (subscription.realms_connected.length > 0) {
        const [realm] = subscription.realms_connected;
        embed.addField('Realms', `Locale: ${realm.locale}`, true);
      }
    }

    if (
      subscription.type === NOTIFICATIONS.MARKET
      || subscription.type === NOTIFICATIONS.ORDERS
    ) {
      if (subscription.items.length > 0 && subscription.items.length < 20) {
        embed.addField('Items', subscription.items.join(' | '), true);
      }
      if (subscription.realms_connected.length > 0) {
        const [realm] = subscription.realms_connected;
        embed.addField('Connected realms ID', String(realm.connected_realm_id), true);
      }
    }

    if (subscription.timestamp) embed.setTimestamp(new Date(subscription.timestamp));
    embed.setFooter('CMNW Search');

    return embed;
  } catch (errorException) {
    console.error(errorException);

    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell @AlexZeDim2645 that there is an error in SearchEmbedMessage', false);
    embed.setThumbnail('https://i.imgur.com/vraz5ML.png');
    return embed;
  }
}

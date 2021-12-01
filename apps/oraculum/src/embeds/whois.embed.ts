import { LeanDocument } from 'mongoose';
import { Account } from '@app/mongo';
import { MessageEmbed } from 'discord.js';

export function WhoisEmbed(account: LeanDocument<Account>): MessageEmbed {
  const embed = new MessageEmbed();
  const _id =  account._id.toString().toUpperCase();
  try {

    embed.setAuthor(_id, undefined);

    if (account.nickname) embed.addField('Name', account.nickname, true);
    if (account.discord_id) embed.addField('Discord', account.discord_id, true);
    if (account.battle_tag) embed.addField('BattleTag', account.battle_tag, true);
    if (account.oraculum_id) embed.addField('Oraculum File', account.oraculum_id, true);
    if (account.is_index) embed.addField('Oraculum Entity', account.is_index === true ? 'Y' : 'N', true);
    if (account.clearance.length) embed.addField('Clearance', account.clearance.map(c => c.toUpperCase()).join(' | '), true);

    if (account.updatedAt) embed.setTimestamp(account.updatedAt);

    return embed;
  } catch (errorException) {
    embed.setAuthor('Error');
    embed.addField('Error', `Error in account ${_id}`, false);
    embed.setThumbnail('https://i.imgur.com/vraz5ML.png');
    return embed;
  }
}

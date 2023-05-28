import { MessageEmbed } from 'discord.js';

export async function TestEmbedMessage(test: any): Promise<MessageEmbed> {
  const embed = new MessageEmbed();
  try {
    return embed;
  } catch (errorException) {
    return embed;
  }
}

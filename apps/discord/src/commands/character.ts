import axios from 'axios';
import { CharacterEmbedMessage } from '../converters';
import { discordConfig } from '@app/configuration';

module.exports = {
  name: 'character',
  description:
    'Return information about specific character. Example usage: `character блюрателла@гордунни`',
  aliases: ['char', 'CHAR', 'CHARACTER', 'Char', 'Character'],
  args: true,
  async execute(message, args) {
    const { data: character } = await axios.get(encodeURI(`http://${discordConfig.basename}:5000/api/osint/character?_id=${args}`));
    const embed = await CharacterEmbedMessage(character);
    await message.channel.send(embed);
  }
}

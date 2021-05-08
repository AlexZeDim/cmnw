import axios from 'axios';
import { HashEmbedMessage } from '../embeds';
import { discordConfig } from '@app/configuration';

module.exports = {
  name: 'hash',
  description: `Allows you to find no more than 20 (*available*) alternative characters (twinks) in OSINT-DB across different realms. Requires a query parameter, which can be a hash string \`f97efc28\`
    > Remember, that match by any of this hash values separately doesn't guarantee that a selected character would belong to one identity. It only gives you a certain level of confidence.
    
    Usage: \`hash a@a99becec48b29ff\``,
  aliases: ['Hash', 'HASH' ],
  cooldown: 10,
  args: true,
  async execute(message, args) {
    const { data: hash } = await axios.get(encodeURI(`${discordConfig.basename}/api/osint/character/hash?hash=${args}`));
    const embed = HashEmbedMessage(args, hash);
    await message.channel.send(embed);
  }
}

// @ts-ignore
import Discord from 'v11-discord.js';
import { OracleCommandInterface } from '../interface';

export const Join: OracleCommandInterface = {
  name: 'join',
  guildOnly: true,
  async execute(
    message: Discord.Message,
    args: string,
    client: Discord.Client,
  ) {
    try {
      const [invite] = args.split(' ');

      await client.user.acceptInvite(invite);

      await message.channel.send(`destination: ${invite}`);
    } catch (errorOrException) {
      console.error(`invite: ${errorOrException}`);
    }
  }
}

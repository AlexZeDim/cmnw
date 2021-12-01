// @ts-ignore
import Discord from 'v11-discord.js';
import { Redis } from '@nestjs-modules/ioredis';

export const Portal = {
  name: 'portal',
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

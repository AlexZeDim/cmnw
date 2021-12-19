// @ts-ignore
import Discord from 'v11-discord.js';
import { Redis } from '@nestjs-modules/ioredis';
import { OracleCommandInterface } from '../interface';
import ms from 'ms';


export const Direct: OracleCommandInterface = {
  name: 'direct',
  guildOnly: true,
  async execute(
    message: Discord.Message,
    args: string,
    client: Discord.Client,
    redis: Redis,
  ) {
    try {
      // TODO direct
      const [targetUser, maxAge, maxUses, temporary] = args.split(' ');

      const user = await client.fetchUser(targetUser);

      const settings = {
        user,
        reply_channel: undefined,
        time: ms('5m'),
        messages: 50,
        destruction: 10000,
        reply: true,
      }

      // TODO test with Friend Request
      const dmChannel = await user.createDM();

      await dmChannel.send('tesst');
    } catch (errorOrException) {
      console.error(`invite: ${errorOrException}`);
    }
  }
}

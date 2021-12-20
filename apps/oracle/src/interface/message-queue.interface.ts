// @ts-ignore
import Discord from 'v11-discord.js';

export class IQMessages {
  message: string;
  author: {
    id: string | Discord.Snowflake;
    username: string;
    discriminator: string;
  };
  channel: {
    id: string | Discord.Snowflake;
    name: string;
  };
  guild?: {
    id: string | Discord.Snowflake;
    name: string;
  }
}

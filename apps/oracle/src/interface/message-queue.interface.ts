// @ts-ignore
import Discord from 'v11-discord.js';

export interface IQMessages {
  message: {
    id: string;
    text: string;
    members?: string[];
  };
  author: {
    id: string | Discord.Snowflake;
    username: string;
    discriminator: string;
  };
  channel: {
    id: string | Discord.Snowflake;
    name: string;
    source_type: string;
  };
  guild?: {
    id: string | Discord.Snowflake;
    name: string;
  };
}

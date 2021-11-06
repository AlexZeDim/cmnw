import { Snowflake } from 'discord.js';

export enum ENTITY_NAME {
  Entity = 'ENTITY',
  Guild = 'GUILD',
  Person = 'PERSON',
  Item = 'ITEM',
  Class = 'CLASS',
  Realm = 'REALM',
}

export enum SOURCE_TYPE {
  Discord = 'discord',
  DiscordText = 'discord-text',
  DiscordVoice = 'discord-voice',
  Text = 'text',
}

export const EXIT_CODES: string[] = [`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

export const DISCORD_UNIT7: Snowflake = '895766801965785138';

export const DISCORD_CORE: Snowflake = '734001595049705534';

export enum DISCORD_CHANNEL_LOGS {
  ingress = '893610811015172156',
  egress = '893610840404668447',
  regress = '893610900471291916'
}

export enum DISCORD_CHANNEL_PARENTS {
  logs = '893610245161631776',
  files = '893610349801132083',
  oraculum = '896421319200112691',
  atlas = '893610514872139787',
}

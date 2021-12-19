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

export enum ORACULUM_COMMANDS {
  Whois = 'whois',
  Invite = 'invite',
  Cypher = 'cypther',
}

export enum ORACULUM_CLEARANCE {
  TextReadOnly = 'TEXT_READ_ONLY',
  TextWrite = 'TEXT_WRITE',
  A = 'A',
  C = 'C',
  D = 'D',
  V = 'V',
}

export const ORACULUM_UNIT7_ID: Snowflake = '895766801965785138';

export const ORACULUM_CORE_ID: Snowflake = '734001595049705534';

export const EXIT_CODES: string[] = [`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

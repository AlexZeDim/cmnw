import { Permissions, Snowflake } from 'discord.js';

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
  communication = '734001596849192963',
  logs = '893610245161631776',
  files = '893610349801132083',
  oraculum = '896421319200112691',
  atlas = '893610514872139787',
}

export const DISCORD_TEXT_READ_ONLY = {
  allow: [
    Permissions.FLAGS.VIEW_CHANNEL,
    Permissions.FLAGS.READ_MESSAGE_HISTORY,
  ],
  deny: [
    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.CREATE_INSTANT_INVITE,
    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,
    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
    Permissions.FLAGS.USE_APPLICATION_COMMANDS,
  ],
};

export const DISCORD_TEXT_WRITE_ONLY = {
  allow: [
    Permissions.FLAGS.VIEW_CHANNEL,
    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.READ_MESSAGE_HISTORY,
  ],
  deny: [
    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.CREATE_INSTANT_INVITE,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
    Permissions.FLAGS.USE_APPLICATION_COMMANDS,
  ],
};

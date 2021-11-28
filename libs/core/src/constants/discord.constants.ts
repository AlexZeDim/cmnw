import { ChannelCreationOverwrites, Permissions, Snowflake } from 'discord.js';
import { IDiscordCore } from '@app/core/interfaces';
import { ChannelTypes } from 'discord.js/typings/enums';

export enum NOTIFICATIONS {
  CANDIDATES = 'candidates',
  ORDERS = 'orders',
  MARKET = 'market',
  INFO = 'info',
  CANCEL = 'cancel',
}

export const DISCORD_UNIT7_ID: Snowflake = '895766801965785138';

export const DISCORD_CORE_ID: Snowflake = '734001595049705534';

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
  permissionsOverwrite: {
    VIEW_CHANNEL: true,
    READ_MESSAGE_HISTORY: true,
  }
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
  permissionsOverwrite: {
    VIEW_CHANNEL: true,
    SEND_MESSAGES: true,
    EMBED_LINKS: true,
    ATTACH_FILES: true,
    READ_MESSAGE_HISTORY: true,
  }
};

export const DISCORD_C_ROLE: Pick<ChannelCreationOverwrites, 'allow' | 'deny'> = {
  allow: [
    Permissions.FLAGS.CREATE_INSTANT_INVITE,
    Permissions.FLAGS.ADMINISTRATOR,
    Permissions.FLAGS.VIEW_CHANNEL,
    Permissions.FLAGS.CHANGE_NICKNAME,
    Permissions.FLAGS.MANAGE_NICKNAMES,
    Permissions.FLAGS.KICK_MEMBERS,
    Permissions.FLAGS.BAN_MEMBERS,

    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,

    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.USE_EXTERNAL_STICKERS,

    Permissions.FLAGS.READ_MESSAGE_HISTORY,
    Permissions.FLAGS.USE_APPLICATION_COMMANDS,

    Permissions.FLAGS.CONNECT,
    Permissions.FLAGS.SPEAK,
    Permissions.FLAGS.STREAM,
    Permissions.FLAGS.USE_VAD,
    Permissions.FLAGS.MUTE_MEMBERS,
    Permissions.FLAGS.DEAFEN_MEMBERS,
    Permissions.FLAGS.MOVE_MEMBERS,
    Permissions.FLAGS.REQUEST_TO_SPEAK,
    Permissions.FLAGS.PRIORITY_SPEAKER,

    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MANAGE_ROLES,
    Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
    Permissions.FLAGS.VIEW_AUDIT_LOG,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.MANAGE_GUILD,

    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
  ],
  deny: []
}

export const DISCORD_D_ROLE: Pick<ChannelCreationOverwrites, 'allow' | 'deny'> = {
  allow: [
    Permissions.FLAGS.VIEW_CHANNEL,
    Permissions.FLAGS.CHANGE_NICKNAME,
    Permissions.FLAGS.MANAGE_NICKNAMES,
    Permissions.FLAGS.KICK_MEMBERS,
    Permissions.FLAGS.BAN_MEMBERS,

    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,

    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.USE_EXTERNAL_STICKERS,

    Permissions.FLAGS.READ_MESSAGE_HISTORY,
    Permissions.FLAGS.USE_APPLICATION_COMMANDS,

    Permissions.FLAGS.CONNECT,
    Permissions.FLAGS.SPEAK,
    Permissions.FLAGS.STREAM,
    Permissions.FLAGS.USE_VAD,
    Permissions.FLAGS.MUTE_MEMBERS,
    Permissions.FLAGS.DEAFEN_MEMBERS,
    Permissions.FLAGS.MOVE_MEMBERS,
    Permissions.FLAGS.REQUEST_TO_SPEAK,
    Permissions.FLAGS.PRIORITY_SPEAKER,

    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MANAGE_ROLES,
    Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
    Permissions.FLAGS.VIEW_AUDIT_LOG,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.MANAGE_GUILD,

    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
  ],
  deny: [
    Permissions.FLAGS.CREATE_INSTANT_INVITE,
    Permissions.FLAGS.ADMINISTRATOR,
  ]
}

export const DISCORD_A_ROLE: Pick<ChannelCreationOverwrites, 'allow' | 'deny'> = {
  allow: [
    Permissions.FLAGS.MANAGE_NICKNAMES,
    Permissions.FLAGS.VIEW_CHANNEL,
    Permissions.FLAGS.CHANGE_NICKNAME,
    Permissions.FLAGS.KICK_MEMBERS,
    Permissions.FLAGS.BAN_MEMBERS,

    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,

    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.USE_EXTERNAL_STICKERS,

    Permissions.FLAGS.READ_MESSAGE_HISTORY,
    Permissions.FLAGS.USE_APPLICATION_COMMANDS,

    Permissions.FLAGS.CONNECT,
    Permissions.FLAGS.SPEAK,
    Permissions.FLAGS.STREAM,
    Permissions.FLAGS.USE_VAD,
    Permissions.FLAGS.MUTE_MEMBERS,
    Permissions.FLAGS.DEAFEN_MEMBERS,
    Permissions.FLAGS.MOVE_MEMBERS,
    Permissions.FLAGS.REQUEST_TO_SPEAK,
    Permissions.FLAGS.PRIORITY_SPEAKER,
  ],
  deny: [
    Permissions.FLAGS.ADMINISTRATOR,

    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MANAGE_ROLES,
    Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
    Permissions.FLAGS.VIEW_AUDIT_LOG,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.MANAGE_GUILD,
    Permissions.FLAGS.CREATE_INSTANT_INVITE,

    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
  ],
};

export const DISCORD_V_ROLE: Pick<ChannelCreationOverwrites, 'allow' | 'deny'> = {
  allow: [
    Permissions.FLAGS.VIEW_CHANNEL,

    Permissions.FLAGS.READ_MESSAGE_HISTORY,

    Permissions.FLAGS.CONNECT,
    Permissions.FLAGS.SPEAK,
    Permissions.FLAGS.STREAM,
    Permissions.FLAGS.USE_VAD,
  ],
  deny: [
    Permissions.FLAGS.ADMINISTRATOR,

    Permissions.FLAGS.MANAGE_CHANNELS,
    Permissions.FLAGS.MANAGE_ROLES,
    Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
    Permissions.FLAGS.VIEW_AUDIT_LOG,
    Permissions.FLAGS.MANAGE_WEBHOOKS,
    Permissions.FLAGS.MANAGE_GUILD,
    Permissions.FLAGS.CREATE_INSTANT_INVITE,

    Permissions.FLAGS.CHANGE_NICKNAME,
    Permissions.FLAGS.MANAGE_NICKNAMES,
    Permissions.FLAGS.KICK_MEMBERS,
    Permissions.FLAGS.BAN_MEMBERS,

    Permissions.FLAGS.SEND_MESSAGES,
    Permissions.FLAGS.MANAGE_THREADS,
    Permissions.FLAGS.USE_PUBLIC_THREADS,
    Permissions.FLAGS.USE_PRIVATE_THREADS,

    Permissions.FLAGS.EMBED_LINKS,
    Permissions.FLAGS.ATTACH_FILES,
    Permissions.FLAGS.ADD_REACTIONS,
    Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
    Permissions.FLAGS.USE_EXTERNAL_STICKERS,

    Permissions.FLAGS.USE_APPLICATION_COMMANDS,

    Permissions.FLAGS.MUTE_MEMBERS,
    Permissions.FLAGS.DEAFEN_MEMBERS,
    Permissions.FLAGS.MOVE_MEMBERS,
    Permissions.FLAGS.REQUEST_TO_SPEAK,
    Permissions.FLAGS.PRIORITY_SPEAKER,

    Permissions.FLAGS.MENTION_EVERYONE,
    Permissions.FLAGS.SEND_TTS_MESSAGES,
  ],
}

export const DISCORD_CORE: IDiscordCore = {
  id: DISCORD_CORE_ID,
  name: 'Cognito Inc',
  logs: {},
  access: {},
  channel_tree: {},
  personal: new Set<Snowflake>(),
  channels: [
    {
      name: 'communiсation',
      type: 'GUILD_CATEGORY',
      channels: [
        {
          name: '📞',
          type: 'GUILD_VOICE',
        },
        {
          name: '🏴',
          type: 'GUILD_VOICE',
        },
        {
          name: '📠',
          type: 'GUILD_VOICE',
        },
        {
          name: '🗼',
          type: 'GUILD_VOICE',
        },
      ]
    },
    {
      name: 'logs',
      type: 'GUILD_CATEGORY',
      channels: [
        {
          name: 'ingress',
          type: 'GUILD_TEXT',
        },
        {
          name: 'egress',
          type: 'GUILD_TEXT',
        },
        {
          name: 'regress',
          type: 'GUILD_TEXT',
        },
      ]
    },
    {
      name: 'files',
      type: 'GUILD_CATEGORY',
    },
    {
      name: 'oraculum',
      type: 'GUILD_CATEGORY',
    },
    {
      name: 'atlas',
      type: 'GUILD_CATEGORY',
    },
  ],
  roles: [
    {
      name: 'C',
      mentionable: false,
      position: 1,
      permissions: DISCORD_C_ROLE
    },
    {
      name: 'D',
      mentionable: false,
      position: 2,
      permissions: DISCORD_D_ROLE
    },
    {
      name: 'A',
      mentionable: false,
      position: 3,
      permissions: DISCORD_A_ROLE
    },
    {
      name: 'V',
      mentionable: false,
      position: 4,
      permissions: DISCORD_V_ROLE
    }
  ],
  clearance: {
    read: DISCORD_TEXT_READ_ONLY,
    write: DISCORD_TEXT_WRITE_ONLY,
  }
};

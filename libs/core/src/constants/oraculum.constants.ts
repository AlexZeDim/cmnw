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

export const EXIT_CODES: string[] = [`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

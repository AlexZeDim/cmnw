export enum ENTITY_NAME {
  Entity = 'Entity',
  Guild = 'Guild',
  Persona = 'Persona',
  Item = 'Item',
  Class = 'Class',
  Realm = 'Realm',
}

export enum SOURCE_TYPE {
  Discord = 'discord',
  DiscordText = 'discord-text',
  DiscordVoice = 'discord-voice',
  Text = 'text',
}

export const EXIT_CODES: string[] = [`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

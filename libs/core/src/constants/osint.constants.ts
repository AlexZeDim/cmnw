export const MAX_LEVEL: number = 60;

export const REALM_TICKER: Map<string, string> = new Map([
  ['Gordunni', 'GRDNNI'],
  ['Lich King', 'LCHKNG'],
  ['Soulflayer', 'SLFLYR'],
  ['Deathguard', 'DTHGRD'],
  ['Deepholm', 'DEPHLM'],
  ['Greymane', 'GREYMN'],
  ['Galakrond', 'GLKRND'],
  ['Howling Fjord', 'HWFJRD'],
  ['Razuvious', 'RAZUVS'],
  ['Deathweaver', 'DTHWVR'],
  ['Fordragon', 'FRDRGN'],
  ['Borean Tundra', 'BRNTND'],
  ['Azuregos', 'AZURGS'],
  ['Booty Bay', 'BTYBAY'],
  ['Thermaplugg', 'TRMPLG'],
  ['Grom', 'GROM'],
  ['Goldrinn', 'GLDRNN'],
  ['Blackscar', 'BLKSCR'],
]);

export const PLAYABLE_CLASS: Map<number, string> = new Map([
  [1, 'Warrior'],
  [2, 'Paladin'],
  [3, 'Hunter'],
  [4, 'Rogue'],
  [5, 'Priest'],
  [6, 'Death Knight'],
  [7, 'Shaman'],
  [8, 'Mage'],
  [9, 'Warlock'],
  [10, 'Monk'],
  [11, 'Druid'],
  [12, 'Demon Hunter'],
]);

export const CHARACTER_CLASS: string[] = [
  'Death Knight', 'Demon Hunter',
  'Druid',        'Hunter',
  'Mage',         'Monk',
  'Paladin',      'Priest',
  'Rogue',        'Shaman',
  'Warlock',      'Warrior'
];

export const COVENANTS: string[] = ['Kyrian', 'Venthyr', 'Night Fae', 'Necrolord'];

export enum FACTION {
  A = "Alliance",
  H = "Horde",
  N = "Neutral"
}

export enum OSINT_SOURCE {
  GETGUILD = 'OSINT-getGuild',
  GETCHARACTER = 'OSINT-getCharacter',
  INDEXGUILD = 'OSINT-indexGuilds',
  ROSTERGUILD = 'OSINT-rosterGuild',
  INDEXCHARACTER = 'OSINT-indexCharacters',
  WOWPROGRESS = 'OSINT-wowprogress',
  WARCRAFTLOGS = 'OSINT-warcraftlogs',
}

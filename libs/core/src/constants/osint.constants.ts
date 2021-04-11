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

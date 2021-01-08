
const RealmsTicker = new Map([
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

const CharactersClasses = [
  'Death Knight', 'Demon Hunter',
  'Druid',        'Hunter',
  'Mage',         'Monk',
  'Paladin',      'Priest',
  'Rogue',        'Shaman',
  'Warlock',      'Warrior'
];

const CharactersProfessions = [
  {
    "name": "Blacksmithing",
    "id": 164
  },
  {
    "name": "Leatherworking",
    "id": 165
  },
  {
    "name": "Alchemy",
    "id": 171
  },
  {
    "name": "Herbalism",
    "id": 182
  },
  {
    "name": "Cooking",
    "id": 185
  },
  {
    "name": "Mining",
    "id": 186
  },
  {
    "name": "Tailoring",
    "id": 197
  },
  {
    "name": "Engineering",
    "id": 202
  },
  {
    "name": "Enchanting",
    "id": 333
  },
  {
    "name": "Fishing",
    "id": 356
  },
  {
    "name": "Skinning",
    "id": 393
  },
  {
    "name": "Jewelcrafting",
    "id": 755
  },
  {
    "name": "Inscription",
    "id": 773
  },
  {
    "name": "Archaeology",
    "id": 794
  },
  {
    "name": "Soul Cyphering",
    "id": 2777
  },
  {
    "name": "Abominable Stitching",
    "id": 2787
  },
  {
    "name": "Ascension Crafting",
    "id": 2791
  }
];

module.exports = { RealmsTicker, CharactersClasses, CharactersProfessions };

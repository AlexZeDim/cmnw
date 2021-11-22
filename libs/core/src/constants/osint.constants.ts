export const MAX_LEVEL: number = 60;

export const OSINT_TIMEOUT_TOLERANCE = 30 * 1000;

export const REALM_LOCALES: string[] = ['ru_ru', 'en_gb', 'de_de', 'fr_fr', 'it_it', 'es_es'];

export const BRACKETS: string[] = ['2v2', '3v3', 'rbg'];

export const RAIDS: string[] = [
  'uldir',
  'battle-of-dazaralor',
  'crucible-of-storms',
  'the-eternal-palace',
  'nyalotha-the-waking-city',
  'castle-nathria',
  'sanctum-of-domination'
];

export const RAID_FACTIONS = ['alliance', 'horde']

export const REALM_TICKER: Map<string, string> = new Map([
  ['Aerie Peak', 'ARPEAK'],
  ['Bronzebeard', 'BRNZBRD'],
  ['Blade\'s Edge', 'BLDEDGE'],
  ['Eonar', 'EONAR'],
  ['Vek\'nilash', 'VLNLSH'],
  ['Agamaggan', 'AGMGGN'],
  ['Bloodscalp', 'BLDSCLP'],
  ['Crushridge', 'CRSHRDG'],
  ['Emeriss', 'EMERSS'],
  ['Hakkar', 'HAKKAR'],
  ['Twilight\'s Hammer', 'TWLHMR'],
  ['Aggra (Português)', 'AGGRAP'],
  ['Grim Batol', 'GRMBTL'],
  ['Frostmane', 'FRSTMN'],
  ['Aggramar', 'AGGRMR'],
  ['Hellscream', 'HLLSCRM'],
  ['Ahn\'Qiraj', 'AHNQRJ'],
  ['Balnazzar', 'BLNZZR'],
  ['Boulderfist', 'BOULDFST'],
  ['Chromaggus', 'CHRMGS'],
  ['Daggerspine', 'DGRSPN'],
  ['Laughing Skull', 'LGHSKL'],
  ['Shattered Halls', 'STRDHL'],
  ['Sunstrider', 'SNSTRD'],
  ['Talnivarr', 'TLNVRR'],
  ['Trollbane', 'TRLLBN'],
  ['Al\'Akir', 'ALAKIR'],
  ['Burning Legion', 'BRNLGN'],
  ['Skullcrusher', 'SKLLCRSH'],
  ['Xavius', 'XAVIUS'],
  ['Alexstrasza', 'ALXSTRZ'],
  ['Nethersturm', 'NTHSTRM'],
  ['Madmortem', 'MDMRTM'],
  ['Proudmoore', 'PRDMRE'],
  ['Alleria', 'ALLERIA'],
  ['Rexxar', 'REXXAR'],
  ['Alonsus', 'ALNSUS'],
  ['Anachronos', 'ANCHRS'],
  ['Kul Tiras', 'KULTRS'],
  ['Aman\'Thul', 'AMNTHL'],
  ['Nazjatar', 'HZJTAR'],
  ['Khaz\'Goroth', 'KHZGRTH'],
  ['Ambossar', 'AMBSSR'],
  ['Kargath', 'KARGATH'],
  ['Thrall', 'THRALL'],
  ['Anetheron', 'ANTHRN'],
  ['Festung der Stürme', 'FGDSTRM'],
  ['Gul\'dan', 'GULDAN'],
  ['Kil\'jaeden', 'KILJDN'],
  ['Nathrezim', 'NTHRZM'],
  ['Rajaxx', 'RAJAXX'],
  ['Anub\'arak', 'ANBARAK'],
  ['Dalvengyr', 'DLVNGYR'],
  ['Frostmourne', 'FRSTMRN'],
  ['Zuluhed', 'ZULHED'],
  ['Arak-arahm', 'ARKARHM'],
  ['Kael\'thas', 'KLTHAS'],
  ['Throk\'Feroth', 'TRKFRTH'],
  ['Arathi', 'ARATHI'],
  ['Illidan', 'ILLIDAN'],
  ['Naxxramas', 'NXXRMS'],
  ['Temple noir', 'TMPLNR'],
  ['Arathor', 'ARTHOR'],
  ['Hellfire', 'HLLFIRE'],
  ['Kilrogg', 'KILROGG'],
  ['Nagrand', 'NAGRAND'],
  ['Runetotem', 'RUNETTEM'],
  ['Archimonde', 'ARCHMND'],
  ['Stonemaul', 'STNMAUL'],
  ['Area 52', 'AREA52'],
  ['Sen\'jin', 'SENJIN'],
  ['Un\'Goro', 'UNGORO'],
  ['Arthas', 'ARTHAS'],
  ['Blutkessel', 'BLTKSSL'],
  ['Durotan', 'DUROTAN'],
  ['Kel\'Thuzad', 'KLTHZD'],
  ['Tirion', 'TIRION'],
  ['Vek\'lor', 'VEKLOR'],
  ['Wrathbringer', 'WRTHBRNG'],
  ['Arygos', 'ARYGOS'],
  ['Khaz\'goroth', 'KHZGRTH'],
  ['Shadowsong', 'SHDWSNG'],
  ['Auchindoun', 'ACHNDN'],
  ['Dunemaul', 'DUNMAUL'],
  ['Jaedenar', 'JAEDNR'],
  ['Sylvanas', 'SYLVNS'],
  ['Azjol-Nerub', 'AZJLNRB'],
  ['Molten Core', 'MLTNCRE'],
  ['Quel\'Thalas', 'QLTHLS'],
  ['Azshara', 'AZSHRA'],
  ['Krag\'jin', 'KRGJIN'],
  ['Baelgun', 'BAELGN'],
  ['Lothar', 'LOTHAR'],
  ['Azuremyst', 'AZRMST'],
  ['Stormrage', 'STRMRG'],
  ['Blackmoore', 'BLCKMR'],
  ['Lordaeron', 'LRDRON'],
  ['Tichondrius', 'TCHNDRS'],
  ['Bladefist', 'BLDFST'],
  ['Frostwhisper', 'FRSTWHSPR'],
  ['Zenedar', 'ZENEDAR'],
  ['Darksorrow', 'DRKSRRW'],
  ['Genjuros', 'GENJRS'],
  ['Neptulon', 'NEPTLN'],
  ['Bloodfeather', 'BLDFTHR'],
  ['Burning Steppes', 'BRNGSTPS'],
  ['Darkspear', 'DRJSPR'],
  ['Executus', 'EXECUTUS'],
  ['Kor\'gall', 'KORGALL'],
  ['Saurfang', 'SAURFANG'],
  ['Shattered Hand', 'SHTTRD'],
  ['Terokkar', 'TRKKAR'],
  ['Bloodhoof', 'BLDHOOF'],
  ['Khadgar', 'KHADGAR'],
  ['Bronze Dragonflight', 'BRNZDRGN'],
  ['Nordrassil', 'NRDRSL'],
  ['Burning Blade', 'BRNGBLD'],
  ['Drak\'thul', 'DRKTHL'],
  ['C\'Thun', 'CTHUN'],
  ['Dun Modr', 'DUNMODR'],
  ['Elune', 'ELUNE'],
  ['Varimathras', 'VRMTHRS'],
  ['Chants éternels', 'CHNTSET'],
  ['Vol\'jin', 'VOLJIN'],
  ['Cho\'gall', 'CHOGALL'],
  ['Eldre\'Thalas', 'ELDRTHLS'],
  ['Sinstralis', 'SNSTRLS'],
  ['Dalaran', 'DALARAN'],
  ['Marécage de Zangar', 'MCGZNGR'],
  ['Colinas Pardas', 'CLNSPRDS'],
  ['Los Errantes', 'LERRANT'],
  ['Tyrande', 'TYRANDE'],
  ['Confrérie du Thorium', 'CNFRTHR'],
  ['Les Clairvoyants', 'CLAIRVS'],
  ['Les Sentinelles', 'SNTNLLS'],
  ['Kirin Tor', 'KRNTHOR'],
  ['Conseil des Ombres', 'CNSLOMBR'],
  ['Culte de la Rive noire', 'CLTRVNR'],
  ['La Croisade écarlate', 'CRSDSCRL'],
  ['Das Konsortium', 'KNSRTM'],
  ['Das Syndikat', 'SYNDKAT'],
  ['Der abyssische Rat', 'ABYSSRAT'],
  ['Die Arguswacht', 'ARGUSWCT'],
  ['Die Todeskrallen', 'DALARAN'],
  ['Kult der Verdammten', 'DALARAN'],
  ['Die ewige Wacht', 'EWGWCHT'],
  ['Die Silberne Hand', 'SLBRNHND'],
  ['Deathwing', 'DTHWNG'],
  ['Dragonblight', 'DRGNBLGT'],
  ['Ghostlands', 'GHSTLNDS'],
  ['Karazhan', 'KARAZHN'],
  ['Lightning\'s Blade', 'LGHBLD'],
  ['The Maelstrom', 'MAELSTRM'],
  ['Darkmoon Faire', 'DRKMNFR'],
  ['Defias Brotherhood', 'DFSBRTHD'],
  ['Earthen Ring', 'EARTHRNG'],
  ['Ravenholdt', 'RVNHLDT'],
  ['Scarshield Legion', 'SCRSLGN'],
  ['Sporeggar', 'SPRGGR'],
  ['The Venture Co', 'VENTRCO'],
  ['Dentarg', 'DENTARG'],
  ['Tarren Mill', 'TRRNMILL'],
  ['Destromath', 'DSTRMTH'],
  ['Gorgonnash', 'GRGNNSH'],
  ['Mannoroth', 'MNNRTH'],
  ['Nefarian', 'NEFARIAN'],
  ['Nera\'thor', 'NERATHOR'],
  ['Dethecus', 'DTHECUS'],
  ['Mug\'thol', 'MUGTHOL'],
  ['Onyxia', 'ONYXIA'],
  ['Terrordar', 'TRRRDAR'],
  ['Theradras', 'THRDRAS'],
  ['Die Nachtwache', 'NCHTWCHE'],
  ['Forscherliga', 'FRCRLIGA'],
  ['Todeswache', 'TDSWCHE'],
  ['Zirkel des Cenarius', 'ZRKLCNRS'],
  ['Der Mithrilorden', 'MTRLDREN'],
  ['Der Rat von Dalaran', 'RATDLRN'],
  ['Doomhammer', 'DMHMMR'],
  ['Menethil', 'MENETHIL'],
  ['Turalyon', 'TRLYON'],
  ['Dragonmaw', 'DRGNMAW'],
  ['Haomarush', 'HAOMRUSH'],
  ['Spinebreaker', 'SPNBRKR'],
  ['Stormreaver', 'STRMRVR'],
  ['Vashj', 'VASHJ'],
  ['Drek\'Thar', 'DREKTHAR'],
  ['Uldaman', 'ULDAMAN'],
  ['Eitrigg', 'EITRIGG'],
  ['Krasus', 'KRASUS'],
  ['Dun Morogh', 'DUNMRGH'],
  ['Norgannon', 'NRGNNON'],
  ['Echsenkessel', 'ECHNKSSL'],
  ['Mal\'Ganis', 'MALGNS'],
  ['Taerar', 'TAERAR'],
  ['Blackhand', 'BLCKHND'],
  ['Emerald Dream', 'EMRLDDRM'],
  ['Terenas', 'TERENAS'],
  ['Exodar', 'EXODAR'],
  ['Minahonda', 'MNHNDA'],
  ['Garona', 'GARONA'],
  ['Ner\'zhul', 'NERZUL'],
  ['Sargeras', 'SRGRAS'],
  ['Garrosh', 'GARROSH'],
  ['Nozdormu', 'NZDRMU'],
  ['Perenolde', 'PRNLDE'],
  ['Shattrath', 'SHTTRTH'],
  ['Teldrassil', 'TLDRSSL'],
  ['Gilneas', 'GILNEAS'],
  ['Nefarian', 'NFRIAN'],
  ['Lightbringer', 'LGTBRNGR'],
  ['Mazrigos', 'MZRGOS'],
  ['Malfurion', 'MLFRION'],
  ['Malygos', 'MALYGOS'],
  ['Malorne', 'MALORNE'],
  ['Ysera', 'YSERA'],
  ['Medivh', 'MEDIVH'],
  ['Suramar', 'SURAMAR'],
  ['Moonglade', 'MNGLDE'],
  ['Steamwheedle Cartel', 'STMWHDL'],
  ['The Sha\'tar', 'SHATAR'],
  ['Muradin', 'MURADIN'],
  ['Ravencrest', 'RVNCRST'],
  ['Sanguino', 'SNGUINO'],
  ['Shen\'dralar', 'SHNDRLR'],
  ['Uldum', 'ULDUM'],
  ['Zul\'jin', 'ZULJIN'],
  ['Stormscale', 'STRMSCL'],
  ['Winterhuf', 'WNTRHUF'],
  ['Thunderhorn', 'THNDRHRN'],
  ['Wildhammer', 'WLDHMMR'],
  ['Aegwynn', 'AEGWYNN'],
  ['Antonidas', 'ANTNDS'],
  ['Argent Dawn', 'ARGNTDWN'],
  ['Blackrock', 'BLCKROCK'],
  ['Chamber of Aspects', 'CHMBRASP'],
  ['Die Aldor', 'ALDOR'],
  ['Draenor', 'DRAENOR'],
  ['Eredar', 'EREDAR'],
  ['Frostwolf', 'FRSTWLF'],
  ['Hyjal', 'HYJAL'],
  ['Kazzak', 'KAZZAK'],
  ['Khaz Modan', 'KHAZMDN'],
  ['Magtheridon', 'MGTHRDN'],
  ['Nemesis', 'NEMESIS'],
  ['Outland', 'OUTLAND'],
  ['Pozzo dell\'Eternità', 'PZZETRNT'],
  ['Ragnaros', 'RAGNRS'],
  ['Silvermoon', 'SLVRMN'],
  ['Twisting Nether', 'TWSTNGN'],
  ['Ulduar', 'ULDUAR'],
  ['Ysondre', 'YSONDRE'],
  ['Ashenvale', 'ASHNVLE'],
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

export const EXPANSION_LIST_ID: Map<string, string> = new Map([
  ['Classic', 'CLSC'],
  ['Burning', 'TBC'],
  ['Lich King', 'WOTLK'],
  ['Cataclysm', 'CATA'],
  ['Pandaria', 'MOP'],
  ['Draenor', 'WOD'],
  ['Legion', 'LGN'],
  ['Battle for Azeroth', 'BFA'],
  ['Shadowlands', 'SHDW']
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
  A = 'Alliance',
  H = 'Horde',
  N = 'Neutral',
  ANY = 'Any',
}

export enum EVENT_LOG {
  GUILD = 'guild',
  CHARACTER = 'character',
}

export enum ACTION_LOG {
  PROMOTE = 'promote',
  DEMOTE = 'demote',
  JOIN = 'join',
  LEAVE = 'leave',
  INHERIT = 'inherit',
  OWNERSHIP = 'ownership',
  TITLE = 'title',
}

export enum ALIAS_KEY {
  Discord = 'discord',
  Bnet = 'battle.tag',
  Twitter = 'twitter',
  Name = 'name',
  Character = 'character',
  Nickname = 'nickname',
  Codename = 'codename',
}

export enum OSINT_SOURCE {
  REQUESTGUILD = 'OSINT-requestGuild',
  UNIQUEGUILDS = 'OSINT-indexGuildsUnique',
  REQUESTCHARACTER = 'OSINT-requestCharacter',
  TOP100 = 'OSINT-hallOfFame',
  GETGUILD = 'OSINT-getGuild',
  GETCHARACTER = 'OSINT-getCharacter',
  MYTHICPLUS = 'OSINT-mythicPlus',
  PVPLADDER = 'OSINT-pvpLadder',
  HALLOFGAME = 'OSINT-top100',
  COLLECTIONS = 'OSINT-collections',
  INDEXGUILD = 'OSINT-indexGuilds',
  ROSTERGUILD = 'OSINT-rosterGuild',
  INDEXCHARACTER = 'OSINT-indexCharacters',
  WOWPROGRESS = 'OSINT-wowprogress',
  WARCRAFTLOGS = 'OSINT-warcraftlogs',
  WOWPROGRESSLFG = 'OSINT-lfgprogress',
  OSINT_LUA = 'OSINT-lua'
}

export enum LFG {
  NEW = 'NEW',
  NOW = 'NOW',
  PREV = 'PREV'
}

export enum EXPANSIONS {
  Classic = 'CSLC',
  TheBurningCrusade = 'TBC',
  WraithOfTheLichKing = 'WOTLK',
  Cataclysm = 'CATA',
  MistsOfPandaria = 'MOP',
  WarlordsOfDraenor = 'WOD',
  Legion = 'LGN',
  BattleForAzeroth = 'BFA',
  Shadowlands = 'SHDW'
}

export enum MYTHIC_PLUS_SEASONS {
  BFA_S1 = 1,
  BFA_S2 = 2,
  BFA_S3 = 3,
  BFA_S4 = 4,
  SHDW_S1 = 5,
  SHDW_S2 = 6,
  SHDW_S3 = 7
}

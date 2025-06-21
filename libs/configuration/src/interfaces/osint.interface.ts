export interface IOsintConfig {
  readonly isIndexCharactersFromFile: boolean;
  readonly isIndexGuildsFromCharacters: boolean;

  readonly isIndexWowProgress: boolean;

  readonly wclCurrentRaidTier: number;
  readonly wclFromPage: number;
  readonly wclToPage: number;
  wclCurrentPage: number;
  readonly wclPage: number;
  readonly wclLogs: number;
}

export interface IOsintConfig {
  readonly wclCurrentRaidTier: number;
  readonly wclFromPage: number;
  readonly wclToPage: number;
  wclCurrentPage: number;
  readonly wclPage: number;
  readonly wclLogs: number;

  readonly isIndexWowProgress: boolean;
}

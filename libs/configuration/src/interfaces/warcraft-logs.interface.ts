export interface IWarcraftLogs {
  readonly raidTier: number;
  readonly fromPage: number;
  readonly toPage: number;
  currentPage: number;
  readonly page: number;
  readonly logs: number;
}

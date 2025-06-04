import { IWarcraftLogs } from '@app/configuration/interfaces';


export const warcraftLogsConfig: IWarcraftLogs = {
  raidTier: Number(process.env.WCL_RAID_TIER),
  fromPage: Number(process.env.WCL_FROM_PAGE),
  toPage: Number(process.env.WCL_TO_PAGE),
  currentPage: Number(process.env.WCL_CURRENT_PAGE || 0),
  page: Number(process.env.WCL_PAGE),
  logs: Number(process.env.WCL_LOGS),
};

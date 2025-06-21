import { IOsintConfig } from '@app/configuration/interfaces';

export const osintConfig: IOsintConfig = {
  wclCurrentRaidTier: Number(process.env.OSINT_WCL_RAID_TIER),
  wclFromPage: Number(process.env.OSINT_WCL_FROM_PAGE),
  wclToPage: Number(process.env.OSINT_WCL_TO_PAGE),
  wclCurrentPage: Number(process.env.OSINT_WCL_CURRENT_PAGE || 0),
  wclPage: Number(process.env.OSINT_WCL_PAGE),
  wclLogs: Number(process.env.OSINT_WCL_LOGS),

  isIndexWowProgress: process.env.OSINT_INDEX_WOW_PROGRESS === 'true',
}
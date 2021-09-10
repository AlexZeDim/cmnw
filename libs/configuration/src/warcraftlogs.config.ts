import { get } from 'config';
import { IWarcraftLogsConfig } from '@app/core';

const WARCRAFTLOGS_CONFIG = get<IWarcraftLogsConfig>('warcraftlogs');

export const warcraftlogsConfig: IWarcraftLogsConfig = {
  raid_tier: WARCRAFTLOGS_CONFIG.raid_tier,
  from: WARCRAFTLOGS_CONFIG.from,
  to: WARCRAFTLOGS_CONFIG.to,
  page: WARCRAFTLOGS_CONFIG.page,
  logs: WARCRAFTLOGS_CONFIG.logs,
}

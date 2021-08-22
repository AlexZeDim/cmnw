import { get } from 'config';
import { IWarcraftLogsConfig } from '@app/core';

const WARCRAFTLOGS_CONFIG = get<IWarcraftLogsConfig>('warcraftlogs');

export const warcraftlogsConfig: IWarcraftLogsConfig = {
  raid_tier: WARCRAFTLOGS_CONFIG.raid_tier,
  pages_from: WARCRAFTLOGS_CONFIG.pages_from,
  pages_to: WARCRAFTLOGS_CONFIG.pages_to,
  page: WARCRAFTLOGS_CONFIG.page,
  logs: WARCRAFTLOGS_CONFIG.logs,
}

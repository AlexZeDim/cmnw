import { get } from 'config';
import { WarcraftLogsConfigInterface } from '@app/core';

const WARCRAFTLOGS_CONFIG = get<WarcraftLogsConfigInterface>('warcraftlogs');

export const warcraftlogsConfig: WarcraftLogsConfigInterface = {
  raid_tier: WARCRAFTLOGS_CONFIG.raid_tier,
  pages_from: WARCRAFTLOGS_CONFIG.pages_from,
  pages_to: WARCRAFTLOGS_CONFIG.pages_to,
  page: WARCRAFTLOGS_CONFIG.page,
  logs: WARCRAFTLOGS_CONFIG.logs,
}

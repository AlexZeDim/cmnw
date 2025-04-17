import config from 'config';
import { IWarcraftLogs } from '@app/configuration/interfaces';

const WARCRAFT_LOGS_CONFIG = config.get<IWarcraftLogs>('warcraft-logs');

export const warcraftLogsConfig: IWarcraftLogs = {
  raidTier: WARCRAFT_LOGS_CONFIG.raidTier,
  fromPage: WARCRAFT_LOGS_CONFIG.fromPage,
  toPage: WARCRAFT_LOGS_CONFIG.toPage,
  currentPage: WARCRAFT_LOGS_CONFIG.currentPage || 0,
  page: WARCRAFT_LOGS_CONFIG.page,
  logs: WARCRAFT_LOGS_CONFIG.logs,
};

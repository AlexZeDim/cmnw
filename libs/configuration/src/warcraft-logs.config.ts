import config from 'config';
import { IWarcraftLogs } from '@app/configuration/interfaces';

const WARCRAFT_LOGS_CONFIG = config.get<IWarcraftLogs>('warcraft-logs');

export const warcraftLogsConfig: IWarcraftLogs = {
  raidTier: WARCRAFT_LOGS_CONFIG.raidTier,
  from: WARCRAFT_LOGS_CONFIG.from,
  to: WARCRAFT_LOGS_CONFIG.to,
  page: WARCRAFT_LOGS_CONFIG.page,
  logs: WARCRAFT_LOGS_CONFIG.logs,
};

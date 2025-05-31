import { IWowProgress } from '@app/configuration/interfaces';

export const wowProgressConfig: IWowProgress = {
  init: process.env.WOW_PROGRESS_INIT === 'true',
};


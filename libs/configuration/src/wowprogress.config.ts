import { get } from 'config';
import { IWowProgress } from '@app/configuration/interfaces';

const WOW_PROGRESS_CONFIG = get<IWowProgress>('wowprogress');

export const wowProgressConfig: IWowProgress = {
  init: WOW_PROGRESS_CONFIG.init,
};

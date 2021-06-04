import { get } from 'config';
import { WowprogressInterface } from '@app/configuration/interfaces';

const WOWPROGRESS_CONFIG = get<WowprogressInterface>('wowprogress');

export const wowprogressConfig: WowprogressInterface = {
  index_init: WOWPROGRESS_CONFIG.index_init
}

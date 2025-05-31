import { CharacterRaidLogResponse } from '@app/core/types';
import { get } from 'lodash';

export const isCharacterRaidLogResponse = (
  response: unknown,
): response is Readonly<CharacterRaidLogResponse> =>
  typeof response === 'object' &&
  !('error' in response) &&
  'data' in response &&
  Array.isArray(get(response, 'data.data.reportData.report.rankedCharacters')) &&
  Array.isArray(get(response, 'data.data.reportData.report.masterData.actors'));

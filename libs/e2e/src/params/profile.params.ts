import { OSINT_TIMEOUT_TOLERANCE } from '@app/core';

export const profileParams = {
  params: { locale: 'en_GB' },
  headers: { 'Battlenet-Namespace': 'profile-eu' },
  timeout: OSINT_TIMEOUT_TOLERANCE,
};

export const dynamicParams = {
  params: { locale: 'en_GB' },
  headers: {
    'Battlenet-Namespace': 'dynamic-eu',
    // 'If-Modified-Since': ifModifiedSince
  },
  timeout: OSINT_TIMEOUT_TOLERANCE,
};

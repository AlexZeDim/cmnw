import { API_HEADERS_ENUM, OSINT_TIMEOUT_TOLERANCE } from '@app/core';

export const apiConstParams = (
  header: API_HEADERS_ENUM,
  ifModifiedSince?: string,
) => ({
  params: { locale: 'en_GB' },
  headers: ifModifiedSince
    ? {
        'Battlenet-Namespace': header,
        'If-Modified-Since': ifModifiedSince,
      }
    : {
        'Battlenet-Namespace': header,
      },
  timeout: OSINT_TIMEOUT_TOLERANCE,
});

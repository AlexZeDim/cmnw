import {
  API_HEADERS_ENUM,
  DMA_TIMEOUT_TOLERANCE,
  OSINT_TIMEOUT_TOLERANCE,
} from '@app/core';

export enum TOLERANCE_ENUM {
  DMA = DMA_TIMEOUT_TOLERANCE,
  OSINT = OSINT_TIMEOUT_TOLERANCE,
}

export enum KEY_STATUS {
  FREE = 'FREE',
  TAKEN = 'TAKEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

export enum STATUS_CODES {
  DEFAULT_STATUS = 100,
  SUCCESS_STATUS = 200,
  SUCCESS_SUMMARY = 201,
  SUCCESS_MEDIA = 202,
  SUCCESS_PETS = 203,
  SUCCESS_MOUNTS = 204,
  SUCCESS_PROFESSIONS = 205,
  KEY_LOCKED = 429,
  ERROR_GUILD = 450,
  ERROR_ROSTER = 451,
  ERROR_PROFESSIONS = 470,
  ERROR_MOUNTS = 470,
  ERROR_PETS = 480,
  ERROR_SUMMARY = 490,
  ERROR_MEDIA = 498,
  ERROR_STATUS = 499,
}

export const KEY_LOCK_ERRORS_NUM = 200;

export const apiConstParams = (
  header: API_HEADERS_ENUM,
  tolerance: TOLERANCE_ENUM = TOLERANCE_ENUM.OSINT,
  isMultiLocale?: boolean,
  ifModifiedSince?: string,
) => ({
  params: isMultiLocale ? {} : { locale: 'en_GB' },
  headers: ifModifiedSince
    ? {
        'Battlenet-Namespace': header,
        'If-Modified-Since': ifModifiedSince,
      }
    : {
        'Battlenet-Namespace': header,
      },
  timeout: tolerance,
});

import { DateTime } from 'luxon';

/**
 * @description Returns lowercase string
 * @param s {string}
 * @return {string}
 */
export const lowercase = (s: string): string => s.toLowerCase();

export const toGuid = (name: string, realm: string) => `${lowercase(name)}@${realm}`;
/**
 * @description Returns capitalized string
 * @param s {string}
 * @return {string}
 */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @description returns uppercase string, with replaces dash for spaces
 * @param s {string}
 * @return {string}
 */
export const fromSlug = (s: string): string =>
  s.toString().charAt(0).toUpperCase() + s.slice(1).replace(/-+/g, ' ');

/**
 * @description return number with precision .00
 * @param n {number}
 * @param digits {number}
 * @return {string}
 */
export const round = (n: number, digits = 2) => parseFloat(n.toFixed(digits));

export const toGold = (n: number, digits = 2) =>
  parseFloat((n / 10000).toFixed(digits));

/**
 * @description Return force lowercased slug format string
 * @param s {string}
 * @return {string}
 */
export const toSlug = (s: string): string =>
  s.replace(/\s+/g, '-').replace(/'+/g, '').toLowerCase();

/**
 * @description Return force lowercase with underscore format string
 * @param s {string}
 * @return {string}
 */
export const toKey = (s: string): string =>
  s.replace(/\s+/g, '_').replace(/'+/g, '').toLowerCase();

export const toLocale = (s: string): string => s.substr(0, 2) + '_' + s.substr(2);

export const toDate = (lastModified: unknown): Date => {
  if (lastModified instanceof Date) return lastModified;

  if (
    typeof lastModified === 'string' &&
    DateTime.fromRFC2822(<string>lastModified).isValid
  ) {
    return DateTime.fromRFC2822(<string>lastModified).toJSDate();
  }

  if (
    typeof lastModified === 'number' &&
    DateTime.fromMillis(lastModified).isValid
  ) {
    return DateTime.fromMillis(<number>lastModified).toJSDate();
  }

  return new Date('1999-09-11T20:00:30');
};

export const toStringOrNumber = (value: string | number) =>
  Number.isNaN(Number(value)) ? value : Number(value);

export const notNull = <T>(value: T | null | undefined): value is T =>
  value != null;

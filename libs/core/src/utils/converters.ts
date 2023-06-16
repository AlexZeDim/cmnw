export const toGuid = (name: string, realm: string) => `${name}@${realm}`;
/**
 * @description Returns capitalized string
 * @param s {string}
 * @return {string}
 */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @description returns Uppercased string, with replaces dash for spaces
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
export const round = (n: number, digits = 2): number =>
  parseFloat(n.toFixed(digits));

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

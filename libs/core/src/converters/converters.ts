/**
 * @description Returns capitalized string
 * @param s {string}
 * @return {string}
 */
export const capitalize = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @description returns Uppercased string, with replaces dash for spaces
 * @param s {string}
 * @return {string}
 */
export const fromSlug = (s: string): string => {
  return s.toString().charAt(0).toUpperCase() + s.slice(1).replace(/-+/g, ' ');
}

/**
 * @description return number with precision .00
 * @param n {string}
 * @return {string}
 */
export const round2 = (n: number): number => {
  return parseFloat(n.toFixed(2));
}

/**
 * @description Return force lowercased slug format string
 * @param s {string}
 * @return {string}
 */
export const toSlug = (s: string): string => {
  return s
    .replace(/\s+/g, '-')
    .replace(/'+/g, '')
    .toLowerCase();
}


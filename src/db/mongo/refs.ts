/**
 *
 * @param s {string}
 * @returns {string}
 */
const toSlug = (s: string): string => {
  return s
      .replace(/\s+/g, '-')
      .replace(/'+/g, '')
      .toLowerCase();
}

/**
 *
 * @param s {string}
 * @returns {string}
 */
const fromSlug = (s: string): string => {
  return s.toString().charAt(0).toUpperCase() + s.slice(1).replace(/-+/g, ' ');
}

/**
 *
 * @param n {number}
 * @returns {number}
 */
const round2 = (n: number): number => {
  return parseFloat(n.toFixed(2));
}

/**
 *
 * @param s {string}
 * @returns {string}
 */
const capitalize = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export {
  toSlug,
  fromSlug,
  round2,
  capitalize
}

export const toGuid = (name: string, realm: string) => `${name}@${realm}`;
/**
 * @description Returns capitalized string
 * @param s {string}
 * @return {string}
 */
export const capitalize = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * @description returns Uppercased string, with replaces dash for spaces
 * @param s {string}
 * @return {string}
 */
export const fromSlug = (s: string): string => {
  return s.toString().charAt(0).toUpperCase() + s.slice(1).replace(/-+/g, ' ');
};

/**
 * @description return number with precision .00
 * @param n {number}
 * @param digits {number}
 * @return {string}
 */
export const round = (n: number, digits = 2): number => {
  return parseFloat(n.toFixed(digits));
};

/**
 * @description Return force lowercased slug format string
 * @param s {string}
 * @return {string}
 */
export const toSlug = (s: string): string => {
  return s.replace(/\s+/g, '-').replace(/'+/g, '').toLowerCase();
};

/**
 * @description Return force lowercase with underscore format string
 * @param s {string}
 * @return {string}
 */
export const toKey = (s: string): string => {
  return s.replace(/\s+/g, '_').replace(/'+/g, '').toLowerCase();
};

/**
 * @description Delay for the selected amount of time in seconds
 * @param seconds {number}
 */
export const delay = (seconds = 5): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
};

/**
 * @description Return array of unique strings from object keys or enum.
 * @param obj
 */
export const enumKeys = <O extends object, K extends keyof O = keyof O>(
  obj: O,
): K[] => {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
};

/**
 * @description Return random integer between minimum and maximum value.
 * @param min {number}
 * @param max {number}
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

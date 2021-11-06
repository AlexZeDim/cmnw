import { ICastingContext } from '@app/core/interfaces';

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


/**
 * @description Return force lowercased with underscore format string
 * @param s {string}
 * @return {string}
 */
export const toKey = (s: string): string => {
  return s
    .replace(/\s+/g, '_')
    .replace(/'+/g, '')
    .toLowerCase();
}

export const delay = (seconds: number = 5): Promise<void> => {
  return new Promise((resolve) => { setTimeout(resolve, seconds * 1000); });
}

export const enumKeys = <O extends object, K extends keyof O = keyof O>(obj: O): K[] => {
  return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

export const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1) + min)

export const parseEntityDelimiters = (value: string | number, context: ICastingContext) => {
  if (context.lines === 1) return value;
  if (context.column === 'languages' && typeof value === 'string') {
    return value.split(';').filter(word => word.trim().length > 0);
  } else if (context.column === 'tags' && typeof value === 'string') {
    return value.split(',').filter(word => word.trim().length > 0);
  }
  return value;
};

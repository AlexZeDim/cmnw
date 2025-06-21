import { setTimeout } from 'timers/promises';

/**
 * @description Delay for the selected amount of time in seconds
 * @param seconds {number}
 */
export const delay = async (seconds = 5) => await setTimeout(seconds * 1000);

/**
 * @description Return array of unique strings from object keys or enum.
 * @param obj
 */
export const enumKeys = <O extends object, K extends keyof O = keyof O>(
  obj: O,
): K[] => Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];

/**
 * @description Return random integer between minimum and maximum value.
 * @param min {number}
 * @param max {number}
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random()*arr.length)]

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

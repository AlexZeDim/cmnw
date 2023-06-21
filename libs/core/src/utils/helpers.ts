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

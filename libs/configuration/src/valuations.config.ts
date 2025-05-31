import { IValuations } from '@app/configuration/interfaces';

export const valuationsConfig: IValuations = {
  build: process.env.VALUATIONS_BUILD === 'true',
};

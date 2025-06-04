import { ICmnw } from '@app/configuration/interfaces';

export const cmnwConfig: ICmnw = {
  clientId: process.env.CMNW_CLIENT_ID,
  clientSecret: process.env.CMNW_CLIENT_SECRET,
  redirectUri: process.env.CMNW_REDIRECT_URL,
  port: Number(process.env.CMNW_PORT),
  origin: [process.env.CMNW_ORIGIN],
};

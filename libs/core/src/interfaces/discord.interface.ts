import { LANG, NOTIFICATIONS } from '@app/core/constants';

export interface DiscordRoute {
  recruiting: number[],
  market: number[],
  orders: number[]
}

export interface DiscordInterface {
  readonly discord_id: string,
  readonly discord_name: string,
  readonly channel_id: string,
  readonly channel_name: string,
  readonly author_id: string,
  readonly author_name: string,
  readonly messages: number,
  readonly time: number,
  readonly route: DiscordRoute,
  type?: NOTIFICATIONS,
  language: LANG,
  prev: number,
  current: number,
  index: number,
  next: number,
  reply?: string,
  question?: string,
}

export interface QuestionInterface {
  readonly id: number;
  readonly language: LANG;
  readonly question: string;
}

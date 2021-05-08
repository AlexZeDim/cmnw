import { FACTION, LANG, NOTIFICATIONS } from '@app/core/constants';

export interface DiscordRoute {
  recruiting: number[],
  market: number[],
  orders: number[]
}

export interface RealmConnected {
  readonly _id: number,
  readonly auctions: number,
  readonly golds: number,
  readonly valuations: number,
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
  readonly actions: Record<string, string[]>
  type?: NOTIFICATIONS,
  language: LANG,
  prev: number,
  current: number,
  index: number,
  next: number,
  reply?: string,
  question?: string,
  items?: number[],
  realms?: RealmConnected[],
  character_class?: string[],
  days_from?: number,
  days_to?: number,
  average_item_level?: number,
  rio_score?: number,
  wcl_percentile?: number,
  faction?: FACTION,
  languages?: string[]
}

export interface QuestionInterface {
  readonly id: number;
  readonly language: LANG;
  readonly question: string;
}

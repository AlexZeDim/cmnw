import { FACTION, LANG, NOTIFICATIONS } from '@app/core/constants';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Interaction, Message } from 'discord.js';

export interface IDiscordRoute {
  recruiting: number[],
  market: number[],
  orders: number[]
}

export interface IDiscordCommand {
  readonly name: string;
  readonly description: string;
  readonly aliases: string[];
  readonly args: boolean;
  readonly cooldown?: number;
  readonly inDevelopment: boolean;
  readonly guildOnly: boolean;
  readonly slashOnly: false;
  readonly slashCommand: SlashCommandBuilder;

  executeMessage(message: Message, args?: string, client?: Client): Promise<void>;
  executeInteraction(interaction: Interaction, client?: Client): Promise<void>;
}

export interface IRealmConnected {
  readonly _id: number,
  readonly auctions: number,
  readonly golds: number,
  readonly valuations: number,
}

export class IDiscordSubscription {
  readonly discord_id: string;
  readonly discord_name: string;
  readonly channel_id: string;
  readonly channel_name: string;
  readonly author_id: string;
  readonly author_name: string;
  readonly type: NOTIFICATIONS;

  readonly realms?: string;
  readonly faction?: string;
  readonly character_class?: string;
  readonly languages?: string;
  readonly item_level?: number;
  readonly rio_score?: number;
  readonly days_from?: number;
  readonly days_to?: number;
  readonly wcl_percentile?: number;

  readonly item_id?: string;
  readonly connected_realm_id?: number;
}

export interface IDiscord {
  readonly discord_id: string,
  readonly discord_name: string,
  readonly channel_id: string,
  readonly channel_name: string,
  readonly author_id: string,
  readonly author_name: string,
  readonly messages: number,
  readonly time: number,
  readonly route: IDiscordRoute,
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
  realms?: IRealmConnected[],
  character_class?: string[],
  days_from?: number,
  days_to?: number,
  average_item_level?: number,
  rio_score?: number,
  wcl_percentile?: number,
  faction?: FACTION,
  languages?: string[]
}

export interface IDiscordQuestion {
  readonly id: number;
  readonly language: LANG;
  readonly question: string;
}

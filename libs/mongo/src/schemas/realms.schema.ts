import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Realm extends Document {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String })
  slug: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  region: string;

  @Prop({ type: String })
  name_locale: string;

  @Prop({ type: String })
  slug_locale: string;

  @Prop({ type: String })
  ticker: string;

  @Prop({ type: String })
  status: string;

  @Prop({ type: String })
  category: string;

  @Prop({ type: String })
  locale: string;

  @Prop({ type: String })
  timezone: string;

  @Prop({ type: String })
  type: string;

  @Prop({ type: String })
  population_status: string;

  @Prop({ type: Number })
  connected_realm_id: number;

  @Prop({ type: [String] })
  connected_realms: [string];

  /**
   * Kihra's WarcraftLogs realm ids
   * for parsing logs via fromLogs
   */
  @Prop({ type: Number })
  wcl_id: number;

  /**
   * String lastModified timestamp for auctions, gold and valuations
   * Required for valuations, getAuctionData, getGold
   */
  @Prop({ default: 0, type: Number })
  auctions: number;

  @Prop({ default: 0, type: Number })
  valuations: number;

  @Prop({ default: 0, type: Number })
  golds: number;
}

export const RealmsSchema = SchemaFactory.createForClass(Realm);
RealmsSchema.index(
  {
    slug: 'text',
    name: 'text',
    name_locale: 'text',
    slug_locale: 'text',
    ticker: 'text',
    region: 'text',
    locale: 'text',
  },
  {
    default_language: 'english',
    weights:
      {
        slug: 10,
        name: 1,
        slug_locale: 1,
        name_locale: 1,
        ticker: 3,
        region: 1,
        locale: 1,
      },
    name: 'SQ',
  },
);
RealmsSchema.index({ connected_realm_id: 1 }, { name: 'CR' });

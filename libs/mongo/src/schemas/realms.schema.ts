import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Realm extends Document {
  @Prop()
  _id: number;

  @Prop()
  slug: string;

  @Prop()
  name: string;

  @Prop()
  region: string;

  @Prop()
  name_locale: string;

  @Prop()
  slug_locale: string;

  @Prop()
  ticker: string;

  @Prop()
  status: string;

  @Prop()
  category: string;

  @Prop()
  locale: string;

  @Prop()
  timezone: string;

  @Prop()
  type: string;

  @Prop()
  population_status: string;

  @Prop({ type: Number })
  connected_realm_id: number;

  @Prop()
  connected_realms: [string];

  /**
   * Kihra's WarcraftLogs realm ids
   * for parsing logs via fromLogs
   */
  @Prop()
  wcl_id: number;

  /**
   * String lastModified timestamp for auctions, gold and valuations
   * Required for valuations, getAuctionData, getGold
   */
  @Prop({ default: 0 })
  auctions: number;

  @Prop({ default: 0 })
  valuations: number;

  @Prop({ default: 0 })
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

import { getModelForClass } from '@typegoose/typegoose';
import { Realm } from "./schemas/realms.schema";
import { Account } from "./schemas/accounts.schema";
import { Auction } from "./schemas/auctions.schema";
import { Character } from "./schemas/characters.schema";
import { Guild } from "./schemas/guilds.schema";
import { Key } from "./schemas/keys.schema";
import { Log } from "./schemas/logs.schema";
import { Gold } from "./schemas/golds.schema";
import { Item } from "./schemas/items.schema";
import { Token } from "./schemas/token.schema";
import { Pricing } from "./schemas/pricing.schema";
import { SkillLine } from "./schemas/skill.line.schema";
import { Valuations } from "./schemas/valuations.schema";
import { SpellEffect } from "./schemas/spell.effect.schema";
import { SpellReagents } from "./schemas/spell.reagents.schema";


const RealmModel = getModelForClass(Realm);
const AccountModel = getModelForClass(Account);
const AuctionsModel = getModelForClass(Auction);
const CharacterModel = getModelForClass(Character);
const GuildModel = getModelForClass(Guild);
const KeysModel = getModelForClass(Key);
const LogModel = getModelForClass(Log);
const GoldModel = getModelForClass(Gold);
const ItemModel = getModelForClass(Item);
const TokenModel = getModelForClass(Token);
const PricingModel = getModelForClass(Pricing);
const SkillLineModel = getModelForClass(SkillLine);
const ValuationsModel = getModelForClass(Valuations);
const SpellEffectModel = getModelForClass(SpellEffect);
const SpellReagentsModel = getModelForClass(SpellReagents);

export {
  RealmModel,
  AccountModel,
  AuctionsModel,
  CharacterModel,
  GuildModel,
  KeysModel,
  LogModel,
  GoldModel,
  ItemModel,
  TokenModel,
  PricingModel,
  SkillLineModel,
  ValuationsModel,
  SpellEffectModel,
  SpellReagentsModel
}

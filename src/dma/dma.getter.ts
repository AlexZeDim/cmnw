import {
  RealmModel,
  AuctionsModel,
  GoldModel,
  ItemModel,
  KeysModel,
  TokenModel,
  PricingModel, SkillLineModel, SpellEffectModel, SpellReagentsModel
} from "../db/mongo/mongo.model";
import BlizzAPI, {BattleNetOptions} from 'blizzapi';
import moment from "moment";
import {ItemProps, ObjectProps, professionsTicker} from "../interface/constant";
import {round2} from "../db/mongo/refs";
import Xray from "x-ray";

const getAuctions = async <T extends { connected_realm_id: number, auctions?: number } & BattleNetOptions> (args: T): Promise<number> => {
  try {

    if (!args.auctions || args.auctions === 0) {
      const realm = await RealmModel.findOne({ connected_realm_id: args.connected_realm_id }).select('auctions').lean();
      if (realm) {
        args.auctions = realm.auctions;
      } else {
        args.auctions = 0;
      }
    }

    const if_modified_since: string = `${moment(args.auctions).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;

    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    const response: { auctions: ObjectProps[], lastModified: string } = await api.query(`/data/wow/connected-realm/${args.connected_realm_id}/auctions`, {
      timeout: 30000,
      params: { locale: 'en_GB' },
      headers: {
        'Battlenet-Namespace': 'dynamic-eu',
        'If-Modified-Since': if_modified_since
      }
    })

    if (!response || !Array.isArray(response.auctions) || !response.auctions.length) return 504

    const ts: number = parseInt(moment(response.lastModified).format('x'))

    const orders = await Promise.all(response.auctions.map(async order => {
      if (order.item && order.item.id) {
        order.item_id = order.item.id
        if (order.item.id === 82800) {
          //TODO pet fix
        }
      }
      if (order.bid) order.bid = round2(order.bid / 10000);
      if (order.buyout) order.buyout = round2(order.buyout / 10000);
      if (order.unit_price) order.price = round2(order.unit_price / 10000);
      order.connected_realm_id = args.connected_realm_id;
      order.last_modified = ts;
      return order
    }))

    await AuctionsModel.insertMany(orders, { rawResult: false });
    await RealmModel.updateMany({ connected_realm_id: args.connected_realm_id }, { auctions: ts });
    return 200
  } catch (e) {
    console.error(e)
    if (e.response && e.response.status) {
      return e.response.status
    }
    return 500
  }
}

const getGold = async () => {
  try {
    const
      now = new Date().getTime(),
      realms = new Set<number>(),
      orders: { connected_realm_id: number; faction: any; quantity: number; status: string; owner: any; price: number; last_modified: number; }[] = [],
      x = Xray();

    const listing = await x('https://funpay.ru/chips/2/', '.tc-item', [
      {
        realm: '.tc-server', //@data-server num
        faction: '.tc-side', //@data-side 0/1
        status: '@data-online',
        quantity: '.tc-amount',
        owner: '.media-user-name',
        price: '.tc-price div',
      },
    ]).then(res => res);

    if (!listing || !Array.isArray(listing) || !listing.length) return

    await Promise.all(listing.map(async order => {
      const realm = await RealmModel
        .findOne({ $text: { $search: order.realm } })
        .select('connected_realm_id')
        .lean();

      if (realm && realm.connected_realm_id && order && order.price && order.quantity) {
        const
          price = parseFloat(order.price.replace(/ ₽/g, '')),
          quantity = parseInt(order.quantity.replace(/\s/g, ''));

        if (quantity < 15000000) {
          realms.add(realm.connected_realm_id)
          orders.push({
            connected_realm_id: realm.connected_realm_id,
            faction: order.faction,
            quantity: quantity,
            status: order.status ? 'Online' : 'Offline',
            owner: order.owner,
            price: price,
            last_modified: now,
          })
        }
      }
    }))

    if (!orders.length) return

    await GoldModel.insertMany(orders, {rawResult: false})
    await RealmModel.updateMany({ 'connected_realm_id': { '$in': Array.from(realms) } }, { golds: now });

  } catch (e) {
    console.error(e)
  }
}

const getItem = async <T extends { _id: number } & BattleNetOptions> (args: T) => {

  const api = new BlizzAPI({
    region: args.region,
    clientId: args.clientId,
    clientSecret: args.clientSecret,
    accessToken: args.accessToken
  });

  /** Check is exits */
  let item = await ItemModel.findById(args._id);
  /** If not, create */
  if (!item) {
    item = new ItemModel({
      _id: args._id,
    });
  }

  /** Request item data */
  const [getItemSummary, getItemMedia] = await (Promise as any).allSettled([
    api.query(`/data/wow/item/${args._id}`, {
      timeout: 10000,
      headers: { 'Battlenet-Namespace': 'static-eu' }
    }),
    api.query(`/data/wow/media/item/${args._id} `, {
      timeout: 10000,
      headers: { 'Battlenet-Namespace': 'static-eu' }
    })
  ]);

  if (getItemSummary.value) {
    /** Schema fields */
    const
      requested_item: Partial<ItemProps> = {},
      fields: string[] = [
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ],
      gold: string[] = ['purchase_price', 'sell_price'];

    /** key value TODO refactor merge */
    for (const [key] of Object.entries(getItemSummary.value)) {
      /** Loot type */
      if (key === 'preview_item') {
        if ('binding' in getItemSummary.value[key]) {
          requested_item.loot_type = getItemSummary.value[key]['binding'].type;
        }
      }

      if (fields.some(f => f === key)) {
        requested_item[key] = getItemSummary.value[key].name['en_GB'];
      } else {
        requested_item[key] = getItemSummary.value[key];
      }

      if (gold.some(f => f === key)) {
        if (key === 'sell_price') {
          item.asset_class.addToSet('VSP');
        }
        requested_item[key] = round2(getItemSummary.value[key] / 10000);
      }
    }

    Object.assign(item, requested_item)

    if (
      getItemMedia.value &&
      getItemMedia.value.assets &&
      getItemMedia.value.assets.length
    ) {
      item.icon = getItemMedia.value.assets[0].value;
    }

    await item.save();
    return item
  }
}

const getToken = async <T extends BattleNetOptions > (args: T) => {
  try {
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' });
    if (!key) return

    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    //TODO it is capable to implement if-modified-since header
    const { last_updated_timestamp, price, lastModified } = await api.query(`/data/wow/token/index`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    })

    const wowtoken = await TokenModel.findById(last_updated_timestamp);

    if (!wowtoken) {
      await TokenModel.create({
        _id: last_updated_timestamp,
        region: 'eu',
        price: round2(price / 10000),
        last_modified: lastModified,
      })
    }

  } catch (e) {
    console.error(e)
  }
}

const getPricing = async <T extends { recipe_id: number, expansion: string, profession: number } & BattleNetOptions> (args: T) => {
  try {
    const writeConcerns = [];

    const api = new BlizzAPI({
      region: args.region,
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      accessToken: args.accessToken
    });

    const [RecipeData, RecipeMedia] = await Promise.all([
      api.query(`/data/wow/recipe/${args.recipe_id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      }),
      api.query(`/data/wow/media/recipe/${args.recipe_id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      })
    ]);

    /**
     * Skip Mass mill and prospect
     * because they are bugged
     */
    if (RecipeData.name && RecipeData.name.en_GB && RecipeData.name.en_GB.includes('Mass')) return



    if ('alliance_crafted_item' in RecipeData) {
      if ('id' in RecipeData.alliance_crafted_item) {
        writeConcerns.push({
          faction: 'Alliance',
          recipe_id: args.recipe_id, //TODO rethink?
          item_id: RecipeData.alliance_crafted_item.id,
          reagents: RecipeData.reagents,
          expansion: args.expansion,
          item_quantity: 0
        })
      }
    }

    if ('horde_crafted_item' in RecipeData) {
      if ('id' in RecipeData.horde_crafted_item) {
        writeConcerns.push({
          faction: 'Horde',
          recipe_id: args.recipe_id,
          item_id: RecipeData.horde_crafted_item.id,
          reagents: RecipeData.reagents,
          expansion: args.expansion,
          item_quantity: 0
        })
      }
    }

    if ('crafted_item' in RecipeData) {
      if ('id' in RecipeData.crafted_item) {
        writeConcerns.push({
          recipe_id: args.recipe_id,
          item_id: RecipeData.crafted_item.id,
          reagents: RecipeData.reagents,
          expansion: args.expansion,
          item_quantity: 0
        })
      }
    }


    for (const concern of writeConcerns) {
      let pricing_method = await PricingModel.findOne({ 'derivatives._id': concern.item_id, 'recipe_id': concern.recipe_id });

      if (!pricing_method) {
        pricing_method = new PricingModel({
          recipe_id: concern.recipe_id,
          create_by: 'DMA-API'
        })
      }

      Object.assign(pricing_method, concern);

      /**
       * Only SkillLineDB stores recipes by it's ID
       * so we need that spell_id later
       */
      const recipe_spell = await SkillLineModel.findById(pricing_method.recipe_id);
      if (!recipe_spell) {
        console.error(`Consensus not found for ${pricing_method.id}`)
        continue
      }

      if (professionsTicker.has(args.profession)) {
        pricing_method.profession = professionsTicker.get(args.profession)
      } else if (professionsTicker.has(recipe_spell.skill_line)) {
        pricing_method.profession = professionsTicker.get(recipe_spell.skill_line)
      }

      pricing_method.spell_id = recipe_spell.spell_id;

      const pricing_spell = await SpellEffectModel.findOne({ spell_id: pricing_method.spell_id });

      if (RecipeData.modified_crafting_slots && Array.isArray(RecipeData.modified_crafting_slots)) {
        RecipeData.modified_crafting_slots = RecipeData.modified_crafting_slots.map((mrs: any) => ({
          _id: mrs.slot_type.id,
          name: mrs.slot_type.name,
          display_order: mrs.display_order
        }))
      }

      /**
       * If we don't have quantity from API,
       * then use locale source
       */
      if ('crafted_quantity' in RecipeData) {
        if ('value' in RecipeData.crafted_quantity) {
          concern.item_quantity = RecipeData.crafted_quantity.value;
        } else if ('minimum' in RecipeData.crafted_quantity) {
          concern.item_quantity = RecipeData.crafted_quantity.minimum;
        } else if (pricing_spell && pricing_spell.item_quantity && concern.item_quantity === 0) {
          concern.item_quantity = pricing_spell.item_quantity;
        }
      } else if (pricing_spell && pricing_spell.item_quantity) {
        concern.item_quantity = pricing_spell.item_quantity;
      }

      /**
       * Build reagent items
       * Rebuild reagents local if necessary
       */
      if (RecipeData.reagents && RecipeData.reagents.length) {
        pricing_method.reagents = RecipeData.reagents.map((item: any) => ({
          _id: parseInt(item.reagent.id),
          quantity: parseInt(item.quantity),
        }))
      } else {
        const reagents = await SpellReagentsModel.findOne({ spell_id: pricing_method.spell_id });
        if (reagents) pricing_method.reagents = reagents.reagents;
      }

      /**
       * Derivatives from write concern
       */
      pricing_method.derivatives.push({ _id: concern.item_id, quantity: concern.item_quantity });

      if (RecipeMedia) pricing_method.media = RecipeMedia.assets[0].value;

      pricing_method.updated_by = 'DMA-API';
      pricing_method.type = 'primary';

      await pricing_method.save();

      return pricing_method;
    }
  } catch (e) {
    console.error(e)
  }
}

export {
  getAuctions,
  getGold,
  getItem,
  getToken,
  getPricing
}

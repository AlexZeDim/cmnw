import {RealmModel, AuctionsModel, GoldModel, ItemModel} from "../db/mongo/mongo.model";
import BlizzAPI, {BattleNetOptions} from 'blizzapi';
import moment from "moment";
import {ItemProps, ObjectProps} from "../interface/constant";
import {round2} from "../db/mongo/refs";
import Xray from "x-ray";

const getAuctions = async <T extends { connected_realm_id: number, auctions: number } & BattleNetOptions> (args: T) => {
  try {

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

    if (!response || !Array.isArray(response.auctions) || !response.auctions.length) return

    const ts: number = parseInt(moment(response.lastModified).format('x'))

    const orders = await Promise.all(response.auctions.map(async order => {
      if (order.item && order.item.id) {
        //console.log(order.item)
        order.item_id = order.item.id
        if (order.item.id === 82800) {
          //TODO pet fix
        }
      }
      if (order.bid) order.bid = round2(order.bid / 10000);
      if (order.buyout) order.buyout = round2(order.buyout / 10000);
      if (order.unit_price) order.unit_price = round2(order.unit_price / 10000);
      order.connected_realm_id = args.connected_realm_id;
      order.last_modified = ts;
      return order
    }))

    await AuctionsModel.insertMany(orders, { rawResult: false });
    await RealmModel.updateMany({ connected_realm_id: args.connected_realm_id }, { auctions: ts });
  } catch (e) {
    console.error(e)
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

export {
  getAuctions,
  getGold,
  getItem
}

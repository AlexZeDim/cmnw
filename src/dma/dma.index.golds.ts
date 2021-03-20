import '../db/mongo/mongo.connection';
import Xray from 'x-ray';
import {GoldModel, RealmModel} from '../db/mongo/mongo.model';

const indexGolds = async (): Promise<void> => {
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
  } finally {
    process.exit(0)
  }
}

indexGolds().catch()

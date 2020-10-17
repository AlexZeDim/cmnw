/**
 * Model importing
 */

const auctions_db = require('../db/models/auctions_db');
const realms_db = require('../db/models/realms_db');

/**
 * @param item_id
 * @returns {Promise<*>}
 */

async function auctionsCrossRealmData(item_id = 168487) {
  try {
    let chartArray = [];
    /** Request realms and prices */
    let [realms, quotes] = await Promise.all([
      realms_db.aggregate([
        {
          $match: { region: 'Europe' },
        },
        {
          $group: {
            _id: {
              connected_realm_id: '$connected_realm_id',
            },
            connected_realms: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: '$_id.connected_realm_id',
            connected_realms: '$connected_realms',
          },
        },
      ]).allowDiskUse(true),
      auctions_db
        .aggregate([
          {
            $match: { 'item.id': item_id },
          },
          {
            $group: {
              _id: {
                connected_realm_id: '$connected_realm_id',
                latest_timestamp: { $max: '$last_modified' },
              },
              price: { $addToSet: '$unit_price' },
            },
          },
          {
            $unwind: '$price',
          },
          {
            $group: {
              _id: null,
              price: { $addToSet: '$price' },
            },
          },
        ])
        .allowDiskUse(true)
        .then(data => {
          return data[0].price.sort((a, b) => a - b);
        }),
    ]);

    /** Data is already sorted by price ascending */
    let L = quotes.length;
    if (L > 3) {
      L = L - 3
    }
    const ninety_percent = Math.floor(L * 0.9);
    let floor = Math.floor(quotes[0]);
    let cap = Math.round(quotes[ninety_percent]);
    const price_range = cap - floor;
    /** Step represent 2.5% for each cluster */
    let step = price_range / 40;
    /**
     * @param start
     * @param stop
     * @param step
     * @returns {number[]}
     */
    const range = (start, stop, step = 1) =>
      Array(Math.ceil((stop + step - start) / step))
        .fill(start)
        .map((x, y) => parseFloat((x + y * step).toFixed(4)));
    /** Create xAxis and yAxis */
    let priceRange_array = await range(floor, cap, step);
    /** Create empty array ob objects chart */
    for (let x_ = 0; x_ < realms.length; x_++) {
      for (let y_ = 0; y_ < priceRange_array.length; y_++) {
        chartArray.push({ x: x_, y: y_, value: 0, oi: 0, orders: 0 });
      }
    }

    const orders = await auctions_db.aggregate([
      {
        $match: { 'item.id': item_id },
      },
      {
        $group: {
          _id: {
            connected_realm_id: '$connected_realm_id',
          },
          latest: {
            $max: '$last_modified',
          },
          data: {
            $push: '$$ROOT',
          },
        },
      },
      {
        $unwind: '$data',
      },
      {
        $addFields: {
          'data.latest': {
            $cond: {
              if: {
                $eq: ['$data.last_modified', '$latest'],
              },
              then: '$latest',
              else: '$false',
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$data',
        },
      },
      {
        $match: {
          latest: {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: {
            connected_realm_id: '$connected_realm_id',
            last_modified: '$latest',
            price: '$unit_price',
          },
          quantity: { $sum: '$quantity' },
          open_interest: {
            $sum: { $multiply: ['$unit_price', '$quantity'] },
          },
          orders: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true);
    for (let order of orders) {
      /** Define coordinates */
      let x,
        y = 0;
      /** xAxis */
      x = realms.map(({ _id }) => _id).indexOf(order._id.connected_realm_id);
      /** yAxis */
      const corrected_price = priceRange_array.reduce((prev, curr) =>
        Math.abs(curr - order._id.price) < Math.abs(prev - order._id.price)
          ? curr
          : prev,
      );
      if (priceRange_array.indexOf(corrected_price) === -1) {
        /** If price rounded is lower then floor, yAxis = 0 */
        if (corrected_price < floor) {
          y = 0;
        }
        /** If price rounded is higher then cap, yAxis = max */
        if (corrected_price > cap) {
          y = priceRange_array.length - 1;
        }
      } else {
        y = priceRange_array.indexOf(corrected_price);
      }
      /** find element in chartArray by its xAxis and yAxis coordinates and add values */
      chartArray.filter(el => {
        if (el.x === x && el.y === y) {
          el.value = el.value + order.quantity;
          el.oi = el.oi + order.open_interest;
          el.orders = el.orders + order.orders;
        }
      });
    }

    return {
      price_range: priceRange_array,
      realms: realms,
      dataset: chartArray,
    };
  } catch (error) {
    console.error(error);
  }
}

module.exports = auctionsCrossRealmData;

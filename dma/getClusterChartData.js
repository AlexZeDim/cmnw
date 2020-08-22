/**
 * Model importing
 */

const auctions_db = require('../db/auctions_db');
const golds_db = require('../db/golds_db');

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<{timestamps: *, price_range: *, dataset: []}>}
 */

async function getClusterChartData(
  item_id = 152510,
  connected_realm_id = 1602,
) {
  try {
    let Model, price_field, price_query, oi_quantity;
    /** Define difference between gold and commdty item */
    if (item_id === 1) {
      const ytd = new Date(new Date().setHours(new Date().getHours() - 12));
      price_query = {
        createdAt: { $gt: ytd },
        connected_realm_id: connected_realm_id,
      };
      price_field = 'price';
      Model = golds_db;
    } else {
      price_query = {
        'item.id': item_id,
        connected_realm_id: connected_realm_id,
      };
      price_field = 'unit_price';
      Model = auctions_db;
    }
    let chartArray = [];
    /** Request all unique values (price x timestamp) for item */
    let [quotes, timestamp] = await Promise.all([
      Model.distinct(price_field, price_query).lean(),
      Model.distinct('last_modified', price_query).lean(),
    ]);
    /** Check for response */
    if (quotes.length && timestamp.length) {
      /** Floor as 2nd value, Cap as .95% */
      let L = quotes.length;
      if (L > 3) {
        L = L - 2
      }
      const ninety_percent = Math.floor(L * 0.9);
      let floor = Math.floor(quotes[0]);
      let cap = Math.round(quotes[ninety_percent]);
      /** Define range */
      const price_range = cap - floor;
      /** Step represent 5% for each cluster */
      let step = price_range / 20;
      /** Generate range and round() */
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
      for (let x_ = 0; x_ < timestamp.length; x_++) {
        for (let y_ = 0; y_ < priceRange_array.length; y_++) {
          chartArray.push({
            x: x_,
            y: y_,
            value: 0,
            oi: 0,
            orders: 0,
          });
        }
      }
      let orders = await Model.find(price_query).lean();
      for (let order of orders) {
        /** Define coordinates */
        let x,
          y = 0;
        /** xAxis */
        x = timestamp.map(Number).indexOf(order.last_modified);
        /** yAxis */
        const corrected_price = priceRange_array.reduce((prev, curr) =>
          Math.abs(curr - order[price_field]) <
          Math.abs(prev - order[price_field])
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
        /** OI gold quantity fix */
        if (item_id === 1) {
          oi_quantity = order.quantity / 1000;
        } else {
          oi_quantity = order.quantity;
        }
        /** find element in chartArray by its xAxis and yAxis coordinates and add values */
        chartArray.filter(el => {
          if (el.x === x && el.y === y) {
            el.value = el.value + order.quantity;
            el.oi = el.oi + order[price_field] * oi_quantity;
            el.orders = el.orders + 1;
          }
        });
      }
      timestamp = timestamp.map(ts => ts * 1000);
      return {
        price_range: priceRange_array,
        timestamps: timestamp,
        dataset: chartArray,
      };
    } else {
      return void 0;
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = getClusterChartData;

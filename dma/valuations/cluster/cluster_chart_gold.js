/**
 * Model importing
 */

const gold_db = require('../../../db/models/golds_db');

/**
 * @param connected_realm_id
 * @returns {Promise<{timestamps: *, price_range: *, dataset: []}>}
 */

async function clusterChartGold (connected_realm_id = 1602) {
  try {
    let chartArray = [];
    let round;
    let [quotes, timestamp] = await Promise.all([
      gold_db
        .distinct('price', {
          status: 'Online',
          connected_realm_id: connected_realm_id,
        })
        .lean(),
      gold_db
        .distinct('last_modified', {
          status: 'Online',
          connected_realm_id: connected_realm_id,
        })
        .lean(),
    ]);
    if (quotes.length && timestamp.length) {
      quotes.sort((a, b) => a - b)
      let L = quotes.length;
      if (L > 3) {
        L = L - 3
      }
      const ninety_percent = Math.floor(L * 0.9);
      let start = Math.floor(quotes[0]);
      let stop = Math.round(quotes[ninety_percent]);
      const price_range = stop - start;
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
      let priceRange_array = await range(start, stop, step);
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
      await gold_db
        .find({ connected_realm_id: connected_realm_id })
        .lean()
        .cursor({ batchSize: 20 })
        .eachAsync(
          async ({ price, quantity, last_modified }) => {
            let x,
              y = 0;
            x = timestamp.map(Number).indexOf(+last_modified);
            if (priceRange_array.indexOf(round(price, step)) === -1) {
              if (round(price, step) < start) {
                y = 0;
              }
              if (round(price, step) > stop) {
                y = priceRange_array.length - 1;
              }
            } else {
              y = priceRange_array.indexOf(round(price, step));
            }
            chartArray.filter(el => {
              if (el.x === x && el.y === y) {
                el.value = el.value + quantity;
                el.oi = el.oi + price * quantity;
                el.orders = el.orders + 1;
              }
            });
          },
          { parallel: 20 },
        );
      if (step < 1) {
        priceRange_array = priceRange_array.map(p => p.toFixed(2));
      }
      timestamp = timestamp.map(ts => ts.toLocaleString('en-GB'));
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

module.exports = clusterChartGold;

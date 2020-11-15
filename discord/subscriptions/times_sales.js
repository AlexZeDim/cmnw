const { MessageEmbed } = require('discord.js');
const { capitalCase }  = require("capital-case");

const discord_db = require('../../db/models/discord_db')
const auctions_db = require('../../db/models/auctions_db')
const realms_db = require('../../db/models/realms_db')
const { differenceBy } = require('lodash');



async function timesAndSales (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({ type: "orders" })
      .sort({ message_sent: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync( async subscriber => {
        if (!subscriber.id.length) return //TODO no items
        if (!subscriber.filters.realm || !subscriber.filters.realm.length) return //TODO no realms

        for (const id of subscriber.id) {
          if (subscriber.filters.realm && subscriber.filters.realm.length) {

            const connected_realms = await realms_db.aggregate([
              {
                $match: {'slug': { '$in': subscriber.filters.realm.map(({ slug }) => slug) } }
              },
              {
                $group: {
                  _id: "$connected_realm_id",
                  auctions: { $first: "$auctions" },
                  connected_realms: { $addToSet: "$slug" }
                }
              }
            ])

            for (const connected_realm_id of connected_realms) {
              const timestamps = await auctions_db.find({ 'connected_realm_id': connected_realm_id._id }).distinct('last_modified')
              if (timestamps.length < 2) {
                return //TODO return timestamps
              }
              timestamps.sort((a, b) => b - a)
              const [ t0, t1 ] = timestamps;

              if (t0 > connected_realm_id.auctions) {
                /**
                 * If latest AH timestamp > then notification realm auction
                 * and update the realms
                 */

                const [ orders_t0, orders_t1 ] = await Promise.all([
                  auctions_db.find({ 'connected_realm_id': connected_realm_id._id, 'last_modified': t0, 'item.id': id }).lean(),
                  auctions_db.find({ 'connected_realm_id': connected_realm_id._id, 'last_modified': t1, 'item.id': id }).lean()
                ])

                if (!orders_t0.length || !orders_t1.length) {
                  return //TODO exception
                }

                //created
                const created = differenceBy(orders_t0, orders_t1, 'id')
                //sold or cancelled
                const removed = differenceBy(orders_t1, orders_t0, 'id')

                //TODO change?
                for (const slug of connected_realm_id.connected_realms) {
                  const index = subscriber.filters.realm.findIndex(realm => realm.slug === slug)
                  subscriber.filters.realm[index].auctions = t0
                }
              }
            }
          }

          Object.assign(query, { 'item.id': id })
          if (subscriber.filters.ilvl) Object.assign(query, { 'ilvl': { '$gte': subscriber.filters.ilvl } })
        }
        //TODO update all array hahahaha
        subscriber.message_sent = Date.now();
        await subscriber.save()
      })
  } catch (error) {
    console.error(error)
  }
}

module.exports = timesAndSales;

const { MessageEmbed } = require('discord.js');
const { capitalCase }  = require("capital-case");

const discord_db = require('../../db/models/discord_db')
const auctions_db = require('../../db/models/auctions_db')
const realms_db = require('../../db/models/realms_db')
const { differenceBy } = require('lodash');



async function orderLogs (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({ type: "orders" })
      .sort({ message_sent: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync( async subscriber => {
        if (!subscriber.id.length) return //TODO no items
        if (!subscriber.filters.realm || !subscriber.filters.realm.length) return //TODO no realms

        if (subscriber.filters.realm && subscriber.filters.realm.length) {

          const connected_realms = await realms_db.aggregate([
            {
              $match: { 'slug': { '$in': subscriber.filters.realm.map(({ slug }) => slug) } }
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

            /**
             * If latest AH timestamp > then
             * starting iterating items for
             * notification message
             */
            if (t0 > connected_realm_id.auctions) {

              const groupOrders = await auctions_db.aggregate([
                {
                  $match: {
                    'connected_realm_id': 1602,
                    'item.id': { '$in': subscriber.id },
                    'last_modified': { '$in': [
                        t0,
                        t1
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: {
                      item: "$item.id",
                      timestamp: "$last_modified"
                    },
                    orders: { $push: "$$ROOT" }
                  }
                },
                {
                  $sort: {
                    '_id.item': -1,
                    '_id.timestamp': -1,
                  }
                }
              ]).allowDiskUse(true)

              for (let i = 0; i < groupOrders.length; i += 2) {
                const embed = new MessageEmbed();

                if (groupOrders[i]._id.timestamp === t0 && groupOrders[i+1]._id.timestamp === t1) {
                  const created = differenceBy(groupOrders[i].orders, groupOrders[i+1].orders, 'id')
                  for (const order of created) {

                  }
                  const removed = differenceBy(groupOrders[i+1].orders, groupOrders[i].orders, 'id')
                  for (const order of removed) {

                  }
                }
              }




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
        //TODO update all array hahahaha
        subscriber.message_sent = Date.now();
        await subscriber.save()
      })
  } catch (error) {
    console.error(error)
  }
}

module.exports = orderLogs;

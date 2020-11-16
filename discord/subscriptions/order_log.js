const { MessageEmbed } = require('discord.js');
const { differenceBy } = require('lodash');

const discord_db = require('../../db/models/discord_db')
const auctions_db = require('../../db/models/auctions_db')
const realms_db = require('../../db/models/realms_db')
const items_db = require('../../db/models/items_db')


async function orderLogs (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({ type: "orders" })
      .sort({ message_sent: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync( async subscriber => {
        const guild = await bot.guilds.cache.get(subscriber.discord_id);
        if (!guild) {
          return
        }
        const guild_channel = await guild.channels.cache.get(subscriber.channel_id)
        if (!guild_channel) {
          return
        }

        if (!subscriber.id.length) return await guild_channel.send("No items found, please add items and try again")
        if (!subscriber.filters.realm || !subscriber.filters.realm.length) return await guild_channel.send("No realms found, please check out for realms and try again")

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
              return await guild_channel.send(`DMA has not found previous timestamp for Auction House: ${connected_realm_id._id}`)
            }
            timestamps.sort((a, b) => b - a)
            const [ t0, t1 ] = timestamps;

            /**
             * If latest AH timestamp > then
             * starting iterating items for
             * notification message
             */
            const { auctions } = subscriber.filters.realm.find(realm => realm.slug === connected_realm_id.connected_realms[0])

            if (t0 > auctions) {

              const groupOrders = await auctions_db.aggregate([
                {
                  $match: {
                    'connected_realm_id': connected_realm_id._id,
                    'item.id': { '$in': subscriber.filters.id },
                    'last_modified': { '$in': [t0, t1] }
                  }
                },
                {
                  $group: {
                    _id: "$item.id",
                    orders_t0: {
                      $push: {
                        $cond: {
                          if: {
                            $eq: [ "$last_modified", t0 ]
                          },
                          then: {
                            id: "$id",
                            quantity: "$quantity",
                            unit_price: "$unit_price",
                            bid: "$bid",
                            buyout: "$buyout",
                          },
                          else: "$$REMOVE"
                        }
                      }
                    },
                    orders_t1: {
                      $push: {
                        $cond: {
                          if: {
                            $eq: [ "$last_modified", t1 ]
                          },
                          then: {
                            id: "$id",
                            quantity: "$quantity",
                            unit_price: "$unit_price",
                            bid: "$bid",
                            buyout: "$buyout",
                          },
                          else: "$$REMOVE"
                        }
                      }
                    }
                  }
                }
              ]).allowDiskUse(true)

              for (const item_orders of groupOrders) {
                const item = await items_db.findById(item_orders._id)
                const embed = new MessageEmbed();

                embed.setTitle(`${(item.ticker || item.name.en_GB.toUpperCase()) || item_orders._id}@${connected_realm_id._id}`);
                embed.setURL(encodeURI(`https://${process.env.domain}/item/${item_orders._id}@${connected_realm_id._id}`));
                if (item.icon) embed.setThumbnail(item.icon)

                const created = differenceBy(item_orders.orders_t0, item_orders.orders_t1, 'id')
                if (created && created.length) {
                  let quantity = 0;
                  let cap = 0;
                  for (const order of created) {
                    quantity += order.quantity
                    if (order.unit_price) cap += order.quantity * order.unit_price
                    if (order.buyout) {
                      cap += order.buyout
                    } else if (order.bid) {
                      cap += order.bid
                    }
                  }
                  embed.addField(
                    '────── CREATED ──────',
                    `Orders: ${created.length}\nQuantity: ${quantity}\nOpen Interest: ${cap.toFixed(2)}g\n───────────────────`,
                    false
                  )
                }

                const removed = differenceBy(item_orders.orders_t1, item_orders.orders_t0, 'id')
                if (removed && removed.length) {
                  let quantity = 0;
                  let cap = 0;
                  for (const order of removed) {
                    quantity += order.quantity
                    if (order.unit_price) cap += order.quantity * order.unit_price
                    if (order.buyout) {
                      cap += order.buyout
                    } else if (order.bid) {
                      cap += order.bid
                    }
                  }
                  embed.addField(
                    '── SOLD OR CANCELLED ──',
                    `Orders: ${removed.length}\nQuantity: ${quantity}\nInterest Close: ${cap.toFixed(2)}g\n───────────────────`,
                    false
                  )
                }
                embed.setTimestamp(t0 * 1000);
                embed.setFooter(`DMA`);
                await guild_channel.send(embed)
              }

              for (const slug of connected_realm_id.connected_realms) {
                const index = subscriber.filters.realm.findIndex(realm => realm.slug === slug)
                subscriber.filters.realm[index].auctions = t0
              }
            }
          }
        }

        subscriber.message_sent = Date.now();
        await subscriber.save()
      })
  } catch (error) {
    console.error(error)
  }
}

module.exports = orderLogs;

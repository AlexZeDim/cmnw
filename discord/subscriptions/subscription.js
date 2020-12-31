const { groupBy, differenceBy } = require('lodash')
const { MessageEmbed } = require('discord.js');
const discord_db = require('../../db/models/discord_db');
const auctions_db = require('../../db/models/auctions_db');

async function subscription ({ _id, type, filters }, channel) {
  try {

    switch (type) {
      case 'recruiting':

        break;
      case 't&s':
      case 'orders':

        if (!filters.realms.length || !filters.items.length) return await channel.send("No realms or items found, please use \`-sub\` to check your filters and try again")

        const connected_realms = groupBy(filters.realms, 'connected_realm_id')

        const requests = []
        let index = 0;

        for (const [connected_realm_id, connected_realm] of Object.entries(connected_realms)) {
          const timestamps = {
            m: Number.MAX_SAFE_INTEGER
          }

          const auction_timestamps = await auctions_db.find({ 'connected_realm_id': connected_realm_id }).distinct('last_modified')
          if (auction_timestamps.length < 2) {
            await channel.send(`DMA has not found T+0 or T-1 timestamps for Auction House: ${connected_realm.map(({name}) => name).join(',')}`)
            continue
          }
          auction_timestamps.sort((a, b) => b - a)
          const [ t0, t1 ] = auction_timestamps;

          timestamps.t0 = t0
          timestamps.t1 = t1

          const message_timestamp = filters.timestamps.find(realm => realm._id === parseInt(connected_realm_id))

          if (message_timestamp) timestamps.m = message_timestamp.auctions

          if (!message_timestamp) await discord_db.findByIdAndUpdate(_id, { $addToSet: { 'filters.timestamps' : { _id: parseInt(connected_realm_id), auctions: timestamps.t1 } } } )

          if (timestamps.t0 <= timestamps.m) continue

          for (const item of filters.items) {
            requests.push({
              query: auctions_db.aggregate([
                {
                  $match: {
                    'connected_realm_id': parseInt(connected_realm_id),
                    'item.id': item._id,
                    'last_modified': { '$in': [timestamps.t0, timestamps.t1] }
                  }
                },
                {
                  $group: {
                    _id: {
                      item_id: '$item.id',
                      connected_realm_id: '$connected_realm_id'
                    },
                    orders_t0: {
                      $push: {
                        $cond: {
                          if: {
                            $eq: [ "$last_modified", timestamps.t0 ]
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
                            $eq: [ "$last_modified", timestamps.t1 ]
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
              ]).allowDiskUse(true),
              index: index++,
              item: item,
              connected_realm_id: connected_realm_id,
              connected_realms: connected_realm,
              t0: timestamps.t0
            })
            if (requests.length >= 5 || index === (Object.entries(connected_realms).length * filters.items.length)) {
              await Promise.all(requests.map(async request => {
                const [orders] = await request.query
                const [created, removed] = await Promise.all([
                  differenceBy(orders.orders_t0, orders.orders_t1, 'id'),
                  differenceBy(orders.orders_t1, orders.orders_t0, 'id')
                ])

                if (type === 't&s') {
                  const message_text = {
                    message: '',
                    line: '',
                    realm: `${request.connected_realms[0].connected_realm.join(',')}`.toString().padEnd(15)
                  }
                  if (created && created.length) {
                    created.map(order => {
                      if (request.item.ticker) {
                        order._name = request.item.ticker
                      } else if (request.item.name['en_GB']) {
                        order._name = request.item.name['en_GB']
                      } else {
                        order._name = request.item._id
                      }
                      order._quantity = `x${order.quantity}`.toString().padEnd(7)
                      order._quote = `${(order.unit_price || (order.buyout || order.bid)).toLocaleString('ru-RU').replace(',', '.')}g`.padEnd(16)
                      message_text.line = `\`| C | ${message_text.realm} | ${order._quantity} | ${order._quote} | ${order._name}\`\n`
                      if (message_text.message.length + message_text.line.length > 1999) {
                        channel.send(message_text.message)
                        message_text.message = '';
                      } else {
                        message_text.message = message_text.message + message_text.line
                      }
                    })
                  }
                  if (removed && removed.length) {
                    removed.map(order => {
                      if (request.item.ticker) {
                        order._name = request.item.ticker
                      } else if (request.item.name['en_GB']) {
                        order._name = request.item.name['en_GB']
                      } else {
                        order._name = request.item._id
                      }
                      order._quantity = `x${order.quantity}`.toString().padEnd(7)
                      order._quote = `${(order.unit_price || (order.buyout || order.bid)).toLocaleString('ru-RU').replace(',', '.')}g`.padEnd(16)
                      message_text.line = `\`| R | ${message_text.realm} | ${order._quantity} | ${order._quote} | ${order._name}\`\n`
                      if (message_text.message.length + message_text.line.length > 1999) {
                        channel.send(message_text.message)
                        message_text.message = '';
                      } else {
                        message_text.message = message_text.message + message_text.line
                      }
                    })
                  }
                  if (message_text.message.length) await channel.send(message_text.message)
                }
                if (type === 'orders') {
                  const data = {
                    created_quantity: 0,
                    created_oi: 0,
                    removed_quantity: 0,
                    removed_oi: 0
                  }
                  const message_embed = new MessageEmbed()
                    .setTitle(`${request.item.ticker || request.item.name['en_GB'].toUpperCase() || request.item._id}@${request.connected_realm_id}`)
                    .setURL(encodeURI(`https://${process.env.domain}/item/${request.item._id}@${request.connected_realm_id}`))
                    .setTimestamp(request.t0 * 1000)
                    .setFooter(`TDMA`)
                  if (request.item.icon) message_embed.setThumbnail(request.item.icon)
                  /**
                   * Only if created orders are exist
                   * we add CREATED block to the message
                   */
                  if (created && created.length) {
                    created.map(order => {
                      data.created_quantity += order.quantity
                      if (order.unit_price) data.created_oi += order.quantity * order.unit_price
                      if (order.buyout) {
                        data.created_oi += order.buyout
                      } else if (order.bid) {
                        data.created_oi += order.bid
                      }
                    })
                    message_embed.addField(
                      '────── CREATED ──────',
                      `Orders: ${created.length}\nQuantity: ${data.created_quantity}\nOpen Interest: ${data.created_oi.toFixed(2)}g\n───────────────────`,
                      false
                    )
                  }
                  if (removed && removed.length) {
                    removed.map(order => {
                      data.removed_quantity += order.quantity
                      if (order.unit_price) data.removed_oi += order.quantity * order.unit_price
                      if (order.buyout) {
                        data.removed_oi += order.buyout
                      } else if (order.bid) {
                        data.removed_oi += order.bid
                      }
                    })
                    message_embed.addField(
                      '── SOLD OR CANCELLED ──',
                      `Orders: ${removed.length}\nQuantity: ${data.removed_quantity}\nInterest Closed: ${data.removed_oi.toFixed(2)}g\n───────────────────`,
                      false
                    )
                  }
                  if (data.created_quantity && data.removed_quantity) {
                    message_embed.addField(
                      '────── CHANGED ──────',
                      `Orders: ${created.length - removed.length}\nQuantity: ${data.created_quantity - data.removed_quantity}\nInterest Diff: ${(data.created_oi - data.removed_quantity).toFixed(2)}g\n───────────────────`,
                      false
                    )
                  }
                  await channel.send(message_embed)
                }
              }))
              requests.length = 0
            }
          }
          await discord_db.findOneAndUpdate({ _id: _id, 'filters.timestamps._id': parseInt(connected_realm_id) }, { 'filters.timestamps.$.auctions': t0 } )
        }
        break
      default:
        return;
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = subscription;

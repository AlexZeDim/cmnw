/**
 * Model importing
 */

const auctions_db = require("../../db/auctions_db");
const realms_db = require("../../db/realms_db");

/**
 *
 * @param item_id {Number}
 * @param connected_realm_id {Number}
 * @returns {Promise<void>}
 */

async function auctionsFeed(item_id = 168487, connected_realm_id) {
  try {
    let query = {
      "item.id": item_id,
    };
    /** If connected realm exists then another $match stage */
    if (connected_realm_id) {
      const t = await realms_db
        .findOne({ connected_realm_id: connected_realm_id })
        .select("auctions")
        .lean();
      Object.assign(query, {
        connected_realm_id: connected_realm_id,
        last_modified: t.auctions,
      });
    }
    return await auctions_db.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "realms",
          localField: "connected_realm_id",
          foreignField: "connected_realm_id",
          as: "connected_realm_id",
        },
      },
      {
        $addFields: {
          max_last_modified: {
            $arrayElemAt: ["$connected_realm_id.auctions", 0],
          },
        },
      },
      {
        $match: { $expr: { $eq: ["$last_modified", "$max_last_modified"] } },
      },
      {
        $addFields: {
          connected_realm_id: "$connected_realm_id.name_locale",
        },
      },
    ]);
  } catch (e) {}
}

module.exports = auctionsFeed;

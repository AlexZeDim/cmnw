const express = require("express");
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../../db/items_db");
const valuations_db = require("../../../db/valuations_db");

/**
 * TODO replace 101 string with https://stackoverflow.com/questions/46466409/map-an-array-of-objects-to-a-simple-array-of-key-values
 */

/**
 * Modules
 */

router.get("/:itemQuery", async function (req, res) {
  try {
    let item,
      response = {};

    const { itemQuery } = req.params;

    isNaN(itemQuery)
      ? (item = await items_db
          .findOne(
            { $text: { $search: itemQuery } },
            { score: { $meta: "textScore" } }
          )
          .sort({ score: { $meta: "textScore" } })
          .lean())
      : (item = await items_db.findById(itemQuery).lean());
    if (item) {
      let valuations = await valuations_db.aggregate([
        {
          $match: {
            item_id: item._id,
            $nor: [{ type: "VENDOR" }, { type: "VSP" }],
          },
        },
        {
          $group: {
            _id: {
              connected_realm_id: "$connected_realm_id",
            },
            latest: {
              $max: "$last_modified",
            },
            data: {
              $push: "$$ROOT",
            },
          },
        },
        {
          $unwind: "$data",
        },
        {
          $addFields: {
            "data.latest": {
              $cond: {
                if: {
                  $eq: ["$data.last_modified", "$latest"],
                },
                then: "$latest",
                else: "$false",
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: "$data",
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
              connected_realm_id: "$connected_realm_id",
              latest_timestamp: "$latest",
            },
            data: { $push: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "realms",
            localField: "_id.connected_realm_id",
            foreignField: "connected_realm_id",
            as: "realms",
          },
        },
        {
          $addFields: {
            "data.connected_realm_id": {
              $map: {
                input: "$realms",
                as: "r",
                in: {
                  $mergeObjects: [
                    "$$r",
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$data.connected_realm_id",
                            cond: {
                              $eq: ["$$this._id", "$$r._id"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $unwind: "$data",
        },
        {
          $replaceRoot: { newRoot: "$data" },
        },
        {
          $addFields: {
            connected_realm_id: {
              $reduce: {
                input: "$connected_realm_id",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    {
                      $cond: [
                        {
                          $eq: ["$$value", ""],
                        },
                        "",
                        ", ",
                      ],
                    },
                    {
                      $toString: "$$this.name_locale",
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $sort: { value: 1 },
        },
      ]);
      Object.assign(response, {
        item: item,
        valuations: valuations,
      });
      await res.status(200).json(response);
    } else {
      await res.status(404).json({ error: "Not found" });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const contracts_db = require("../../db/contracts_db");

router.get('/:i-:dwm.:my@:r', async (req, res) => {
    try {
        const {i, dwm, my, r} = req.params;
        if (r) {
            let item;
            let requestArray = [];
            isNaN(i) ? (requestArray.push(items_db.findOne({$text:{$search: i}},{score:{$meta:"textScore"}}).sort({score:{$meta:"textScore"}}).lean().exec())) : (requestArray.push(items_db.findById(i).lean().exec()));
            isNaN(r) ? (requestArray.push(realms_db.findOne({$text:{$search: r}}).lean().exec())) : (requestArray.push(realms_db.findById(r).lean().exec()));
            let [{_id, name, ticker}, realm] = await Promise.all(requestArray);
            (ticker) ? (item = ticker) : (item = name.en_GB);
            let contract = await contracts_db.findOne({$or: [
                    { _id: `${item}-${dwm}.${my}@${realm.connected_realm_id}` },
                    {
                        code: `${item}-${dwm}.${my}`,
                        connected_realm_id: realm.connected_realm_id,
                        item_id: _id
                    }
                ]}).lean();
            contract.realmName = realm.name;
            res.status(200).json(contract);
        }
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const contracts_db = require("../../db/contracts_db");

router.get('/:code@:realm', async (req, res) => {
    try {
        //TODO check matching pattern and code date as ITEM-().()@REALM
        let item;
        let requestArray = [];
        if (isNaN(req.params.code.match(/.+?(?=-)/g)[0])) {
            requestArray.push(items_db.findOne({$text:{$search: req.params.code.match(/.+?(?=-)/g)[0]}}).exec())
        } else {
            requestArray.push(items_db.findById(Number(req.params.code.match(/.+?(?=-)/g)[0])).exec())
        }
        if (isNaN(req.params.realm)) {
            requestArray.push(realms_db.findOne({$text:{$search: req.params.realm}}).exec())
        } else {
            requestArray.push(realms_db.findById(Number(req.params.realm)).exec())
        }
        let [{_id, name, ticker}, realm] = await Promise.all(requestArray);
        (ticker) ? (item = ticker) : (item = name.en_GB);
        let contract = await contracts_db.findOne({$or: [
            { _id: `${req.params.code}@${realm.connected_realm_id}` },
            {
                code: `${item}${req.params.code.match(/-(.*)/)[0]}`,
                connected_realm_id: realm.connected_realm_id,
                item_id: _id
            }
        ]}).lean();
        contract.realmName = realm.name;
        res.status(200).json(contract);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;
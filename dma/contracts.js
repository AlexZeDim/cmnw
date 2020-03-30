const contracts_db = require("../db/contracts_db");

async function contracts () {
    try {
        let test = await contracts_db.find({_id: /GOLD/, connected_realm_id: 1602, type: 'D'},{
            "_id": 1,
            "code": 1
        }).sort({updatedAt: -1}).limit(5).lean();
        console.log(test)
    } catch (err) {
        console.log(err);
    }
}

contracts();
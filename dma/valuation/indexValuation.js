const items_db = require("../../db/items_db");


/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuation () {
    try {
        console.log(
            [{name: 1}, {name: 2}, {name: 3}, {name: 4}].reduce((a, { name }) => a + name, 0)
        )
    } catch (err) {
        console.log(err);
    }
}

indexValuation();
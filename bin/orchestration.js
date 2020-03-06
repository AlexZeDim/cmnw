/***
 * TODO check dot-env
 * TODO checkDB exist/index
 * TODO modules
 *
 *
 *
 *
 */

const fs = require("fs");

if (fs.existsSync('./.env')) {
    console.log('yes');
    require('dotenv').config();
    console.log(process.env.login);
    /***
     *
     * FIXME checkDB exist/index with duplicate
     *
     */
    if (fs.existsSync('../db/keys_db')) {

    }
    if (fs.existsSync('../voluspa')) {
        console.log('test')
    } else {
        //TODO voluspa doesn't exist
    }
} else {
    console.log('no')
    //TODO create env via promtly
}
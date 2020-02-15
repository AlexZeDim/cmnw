const keys_db = require("../db/keys_db");
const schedule = require('node-schedule');
const axios = require('axios');

schedule.scheduleJob(`*/1 * * *`, function() {
    getTokens();
});

async function getTokens () {
    try {
        const cursor = await keys_db.find({}).cursor();
        for (let auth = await cursor.next(); auth != null; auth = await cursor.next()) {
            const {access_token, expires_in} = await axios.get(`https://eu.battle.net/oauth/token?grant_type=client_credentials&client_id=${auth._id}&client_secret=${auth.secret}`).then(res => {
                return res.data;
            });
            await keys_db.updateOne({_id: auth._id},{token: access_token, expired_in: expires_in});
            console.info(`${getTokens.name},U,${auth._id},${expires_in}`);
        }
    } catch (e) {
        console.log(e);
    }
}
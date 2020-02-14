const guilds_db = require("../../db/guilds_db");

(async function test () {
    const res = await guilds_db.deleteMany({ source: 'VOLUSPA-fromLogs' });
    console.log(res.deletedCount)
})();

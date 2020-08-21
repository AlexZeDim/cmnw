/**
 * Connection with DB
 */

const { connect, connection } = require("mongoose");
require("dotenv").config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4,
  }
);

connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", () =>
  console.log("Connected to database on " + process.env.hostname)
);

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");

/**
 * Modules
 */

const Xray = require("x-ray");
let x = Xray();

/***
 * Index every realm for WCL id,
 * unfortunately it can't be done with indexRealms so we should visit every page of WCL one-by-one
 * @param startId US:0,246 EU:247,517 (RU: 492) Korea: 517
 * @param endId
 * @returns {Promise<void>}
 */

async function indexRealms_WCL(startId = 247, endId = 517) {
  try {
    console.time(`OSINT-${indexRealms_WCL.name}`);
    for (let wcl_id = startId; wcl_id < endId; wcl_id++) {
      let realm_name = await x(
        `https://www.warcraftlogs.com/server/id/${wcl_id}`,
        ".server-name"
      ).then((res) => {
        return res;
      });
      let realm = await realms_db.findOne({
        $or: [
          { name: realm_name },
          { name_locale: realm_name },
          { locale_slug: realm_name },
        ],
      });
      if (realm) {
        realm.wcl_id = wcl_id;
        realm.save();
        console.info(`U,${wcl_id},${realm_name}`);
      } else {
        console.info(`E,${wcl_id},${realm_name}`);
      }
    }
    connection.close();
    console.timeEnd(`OSINT-${indexRealms_WCL.name}`);
  } catch (err) {
    console.error(`E,${err}`);
  }
}

indexRealms_WCL();

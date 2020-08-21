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

const pricing_methods = require("../../db/pricing_methods_db");

/**
 * Modules
 */

const csv = require("csv");
const fs = require("fs");

/**
 *
 * API => skilllineability (spell_ID) => spelleffect (item_quantity)
 * OR (LABS)
 * spell_reagents => skilllineability => spelleffect => API
 *
 * TODO exp based on path
 * @param path
 * @param expr
 * @returns {Promise<void>}
 */

async function importMethodsClientCSV(path, expr) {
  try {
    let eva = fs.readFileSync(path, "utf8");
    csv.parse(eva, async function (err, data) {
      const L = data.length;
      switch (expr) {
        case "spelleffect":
          /**
           *  EffectItemType - itemID
           *  EffectBasePointsF - itemQuantity
           *  SpellID - spellID
           *
           * @type {*[]}
           */
          let SpellEffect = [];
          for (let i = 1; i < L; i++) {
            let row = {};
            row.length = 0;
            await Promise.all([
              data[i].map((row_value, i) => {
                if (!isNaN(row_value)) {
                  row_value = parseInt(row_value);
                }
                Object.assign(row, { [data[0][i]]: row_value });
              }),
            ]);
            SpellEffect.push(row);
          }
          let SE_cursor = await pricing_methods
            .find({ type: "primary" })
            .cursor();
          SE_cursor.on("data", async (craft_quene) => {
            SE_cursor.pause();
            let profession_Q = await SpellEffect.find(
              ({ SpellID }) => SpellID === craft_quene.spell_id
            );
            if (
              profession_Q.hasOwnProperty("EffectBasePointsF") &&
              profession_Q.hasOwnProperty("SpellID")
            ) {
              console.info(
                `${craft_quene._id}:${craft_quene.profession}:${craft_quene.expansion}:${craft_quene.spell_id}=${profession_Q.SpellID}=>${profession_Q.EffectBasePointsF}`
              );
              craft_quene.item_quantity = parseInt(
                profession_Q.EffectBasePointsF
              );
              craft_quene.updatedBy = `DMA-${importMethodsClientCSV.name}`;
            }
            craft_quene.save();
            SE_cursor.resume();
          });
          SE_cursor.on("close", async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            connection.close();
          });
          break;
        case "spellreagents":
          let array = [];
          //IDEA find it by headers
          let reagentsIndex = [2, 3, 4, 5, 6, 7, 8, 9];
          let quantityIndex = [10, 11, 12, 13, 14, 15, 16, 17];
          for (let i = 1; i < L; i++) {
            let row = {};
            row.length = 0;

            let row_reagentArray = [];

            for (let r = 0; r < reagentsIndex.length; r++) {
              if (data[i][reagentsIndex[r]] !== "0") {
                let row_reagent = {};
                row_reagent._id = parseInt(data[i][reagentsIndex[r]]);
                row_reagent.quantity = parseInt(data[i][quantityIndex[r]]);
                row_reagentArray.push(row_reagent);
              }
            }
            //TODO find by spell_id and array = 0;
            let professionQ = await pricing_methods.findOne({
              spell_id: parseInt(data[i][1]),
            });
            if (professionQ) {
              //IDEA should we update? Not lean()!
            } else {
              /**
               * IDEA create new CollectonLab for
               * {
               *      spell_id: parseInt(data[i][1]),
               *      reagents: row_reagentArray
               * }
               */
            }
          }
          break;
        case "skilllineability":
          /***
           * ID - recipeID
           * SkillLine - professionID
           * Spell - spellID
           * SupercedesSpell - determines RANK of currentSpell, supercedes weak rank
           * MinSkillLineRank - require skill points
           * Flags: 0 or 16 ??????
           * NumSkillUps - skill points up on craft
           * TrivialSkillLineRankHigh - greenCraftQ
           * TrivialSkillLineRankLow - yellowCraftQ
           * SkillupSkillLineID represent subCategory in professions, for expansionTicker
           *
           * @type {*[]}
           */
          let SkillLineAbility = [];
          for (let i = 1; i < L; i++) {
            let row = {};
            row.length = 0;
            await Promise.all([
              data[i].map((row_value, i) => {
                if (!isNaN(row_value)) {
                  row_value = parseInt(row_value);
                }
                Object.assign(row, { [data[0][i]]: row_value });
              }),
            ]);
            SkillLineAbility.push(row);
          }
          //TODO write from local or add to API
          console.time("write");
          let SLA_cursor = await pricing_methods
            .find({ type: "primary" })
            .cursor();
          SLA_cursor.on("data", async (craft_quene) => {
            SLA_cursor.pause();
            let profession_Q = SkillLineAbility.find(
              (x) => x.ID === craft_quene.recipe_id
            );
            if (profession_Q.hasOwnProperty("Spell")) {
              console.info(
                `${profession_Q.ID}=${craft_quene._id}:${craft_quene.profession}:${craft_quene.expansion}=>${profession_Q.Spell}`
              );
              craft_quene.spell_id = profession_Q.Spell;
              craft_quene.updatedBy = `DMA-${importMethodsClientCSV.name}`;
              //craft_quene.type = `primary`;
            }
            craft_quene.save();
            SLA_cursor.resume();
          });
          SLA_cursor.on("close", async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            connection.close();
          });
          console.timeEnd("write");
          break;
        default:
          console.log("Sorry, we got nothing");
      }
    });
  } catch (err) {
    console.log(err);
  }
}

importMethodsClientCSV("C:\\spelleffect.csv", "spelleffect");

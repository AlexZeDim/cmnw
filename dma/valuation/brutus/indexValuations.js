const items_db = require("../../../db/items_db");
//const auctions_db = require("../../db/auctions_db");
//const getPricing = require("./getValuation");
const getPricingMethods = require("../getPricingMethods");
const getDerivativeMethods = require("./getDerivativeMethods");
const pricing_methods = require("../../../db/pricing_methods_db");
const {connection} = require('mongoose');

async function indexValuations () {
    try {
        console.time(`DMA-${indexValuations.name}`);
        let cursor = await items_db.find({expansion: "BFA"}).limit(10).cursor({batchSize: 10});
        cursor.on('data', async item => {
            cursor.pause();
            let primary_methods = await getPricingMethods(item._id, false);
            let derivative_methods = await getDerivativeMethods(primary_methods);
            console.info(`${item._id}:${item.name.en_GB}, ${derivative_methods.length}`);
            if (derivative_methods && derivative_methods.length) {
                for (let derivative_method of derivative_methods) {
                    await pricing_methods.findByIdAndUpdate(
                        {
                            _id: derivative_method._id
                        },
                        derivative_method,
                        {
                            upsert : true,
                            new: true,
                            setDefaultsOnInsert: true,
                            lean: true
                        }
                    ).then(method => console.info(`${item._id}:${item.name.en_GB}=>${method._id}`));
                }
            }
            cursor.resume();
        });
        cursor.on('error', error => {
            console.error(`E,DMA-${indexValuations.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 60000));
            connection.close();
            console.timeEnd(`DMA-${indexValuations.name}`);
        });
    } catch (err) {
        console.log(err);
    }
}

indexValuations();
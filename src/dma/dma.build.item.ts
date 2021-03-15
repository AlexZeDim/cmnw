import '../db/mongo/mongo.connection';
import fs from 'fs-extra';
import path from 'path';
import csv from 'async-csv';
import {ItemModel} from "../db/mongo/mongo.model";
import {ExpansionIdTicker} from "../interface/constant";

(async () => {
  try {
    const dir = path.join(__dirname, '..', '..', 'import');
    await fs.ensureDir(dir);
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file === 'taxonomy.csv' || file === 'itemsparse.csv') {
        const csvString = await fs.readFile(path.join(dir, file), 'utf-8');

        const rows: any[] = await csv.parse(csvString, {
          columns: true,
          skip_empty_lines: true,
          cast: value => (!isNaN(value as any)) ? parseInt(value) : value
        });
        switch (file) {
          case 'taxonomy.csv':
            for (const row of rows) {
              const item = await ItemModel.findById(row._id);
              if (item) {
                if (row.ticker) item.ticker = row.ticker;
                if (row.profession_class ) item.profession_class  = row.profession_class;
                if (row.asset_class) {
                  if (row.asset_class.includes('.')) {
                    const asset_classes = row.asset_class.split('.');
                    for (const asset_class of asset_classes) {
                      item.asset_class.addToSet(asset_class);
                    }
                  } else {
                    item.asset_class.addToSet(row.asset_class);
                  }
                }
                if (row.tags) {
                  if (row.tags.includes('.')) {
                    const tags = row.tags.split('.');
                    for (const tag of tags) {
                      item.tags.addToSet(tag);
                    }
                  } else {
                    item.tags.addToSet(row.tags);
                  }
                }
                await item.save();
              }
            }
            break;
          case 'itemsparse.csv':
            for (const row of rows) {
              await ItemModel.findById(row.ID, { stackable: row.Stackable, expansion: ExpansionIdTicker.get(row.ExpansionID) })
            }
            break;
        }
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
})();

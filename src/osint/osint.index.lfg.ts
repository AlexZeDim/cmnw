import '../db/mongo/mongo.connection';
import {KeysModel} from "../db/mongo/mongo.model";
import {Tabletojson} from 'tabletojson';

/**
 * place in index Q first two wowprogress pages
 */

const indexLookingForGroup = async (): Promise<void> => {
  try {
    const key = await KeysModel.findOne({ tags: `BlizzardAPI` });
    if (!key || !key.token) return

    const [first, second] = await Promise.all([
      Tabletojson.convertUrl('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts').then(([tableData]) => tableData),
      Tabletojson.convertUrl('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then(([tableData]) => tableData),
    ]);

    const characters = [...first, ...second];

    characters.map((c: { Character: string, Realm: string }) => {
      if ('Character' in c && 'Realm' in c) {
        const character = {
          name: c.Character.trim(),
          realm: c.Realm.split('-')[1].trim(),
          createdBy: `OSINT-lfg`,
          updatedBy: `OSINT-lfg`,
          region: 'eu',
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token,
        }
        if (character) {
          //TODO add to character Q, guildRank, with special params

        }
      }
    })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexLookingForGroup().catch();

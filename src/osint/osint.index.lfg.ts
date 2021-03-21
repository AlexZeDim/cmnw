import '../db/mongo/mongo.connection';
import {KeysModel} from "../db/mongo/mongo.model";
import {Tabletojson} from 'tabletojson';
import {CharacterProps} from '../interface/constant';
import {BattleNetOptions} from 'blizzapi';
import {toSlug} from '../db/mongo/refs';
import {queueCharacters} from './osint.queue';

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

    await Promise.all(characters.map(async (c: { Character: string, Realm: string }) => {
      if ('Character' in c && 'Realm' in c) {

        const
          name: string = c.Character.trim(),
          realm: string = c.Realm.split('-')[1].trim();

        if (name && realm) {
          /**
           * Add each character to Q,
           * with highest priority
           * and update WCL & RIO & WP
           */
          const character: CharacterProps & BattleNetOptions = {
            _id: toSlug(`${c.Character.trim()}@${c.Realm.split('-')[1].trim()}`),
            name: name,
            realm: realm,
            createdBy: `OSINT-lfg`,
            updatedBy: `OSINT-lfg`,
            updateRIO: true,
            updateWCL: true,
            updateWP: true,
            region: 'eu',
            createOnlyUnique: false,
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token,
          }

          await queueCharacters.add(
            character._id,
            character,
            {
              jobId: character._id,
              lifo: true,
              priority: 1
            }
          );
        }
      }
    }));
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexLookingForGroup().catch();

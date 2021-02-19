import {CharacterProps} from '../interface/constant';
import {LogModel} from '../db/mongo/models/logs.model';

const characterDetectDiff = async (character_o: CharacterProps, character_u: CharacterProps): Promise<void> => {
  try {
    const
      detectiveFields: string[] = ['name', 'realm', 'race', 'gender', 'faction'],
      t0: Date = character_o.last_modified || character_o.updatedAt || new Date(),
      t1: Date = character_u.last_modified || character_u.updatedAt || new Date();
    await Promise.all([detectiveFields.map(async check => {
      if (check in character_o && check in character_u && character_o[check] !== character_u[check]) {
        if (check === 'name' || check === 'realm') {
          await LogModel.updateMany(
            {
              root_id: character_o._id,
            },
            {
              root_id: character_u._id,
              $push: { root_history: character_u._id },
            },
          );
        }
        await LogModel.create({
          root_id: character_u._id,
          root_history: [character_u._id],
          action: check,
          event: 'character',
          original: character_o[check],
          updated: character_u[check],
          t0: t0,
          t1: t1,
        })
      }
    })])
  } catch (e) {
    console.error(`E,${characterDetectDiff.name}:${e}`)
  }
}

export { characterDetectDiff }

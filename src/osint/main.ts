import '../db/mongo/connection'
import {CharacterModel} from '../db/mongo/characters.model'
import {queueCharacters} from '../index'

//TODO cron management in another Q
(async function indexCharacters (bulkSize: number = 30) {
  try {
    //TODO check queue status first, and add to q only if it has slots
    console.time(`OSINT-${indexCharacters.name}`);
    let i = 0;
    await CharacterModel
      .find()
      .lean()
      .cursor({ batchSize: bulkSize })
      .eachAsync(async (character: any): Promise<void> => { //FIXME refactor and review status of EachAsync
        console.log(i++, `${character._id}`)
        //TODO we want to add every character to the queue, unique and priority
        await queueCharacters.add(character._id, { _id: character._id });
      }, { parallel: bulkSize })
  } catch (e) {
    console.error(e)
  } finally {
    console.timeEnd(`OSINT-${indexCharacters.name}`);
  }
})();

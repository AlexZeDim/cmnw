const character_db = require('./db/models/characters_db')
const realms_db = require('./db/models/realms_db')
const getCharacter = require('./osint/characters/get_character');
const keys_db = require('./db/models/keys_db');

const root = {
  character: async ({id}) => {
    const character = await character_db.findById(id.toLowerCase());
    if (!character) {
      if (!id.includes('@')) {
        return
      }
      const [ nameSlug, realmSlug ] = id.split('@')

      const realm = await realms_db.findOne({ $text: { $search: realmSlug } }, { _id: 1, slug: 1, name: 1 });
      if (!realm) {
        return
      }
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getCharacter(
        { name: nameSlug, realm: {slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`},
        token,
        true,
        true
      );
      return await character_db.findById(id.toLowerCase());
    }
    return character
  }
}

module.exports = root;

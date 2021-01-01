const crc32 = require('fast-crc32c');

async function updatePets (name, realm, BlizzAPI) {
  try {
    const hash_b = [];
    const hash_a = [];
    const pets_collection = {
      hash: {},
      pets: [],
    };
    const response = await BlizzAPI.query(`/profile/wow/character/${realm}/${name}/collections/pets`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.pets || !response.pets.length) return pets_collection
    const { pets } = response;
    pets.map(pet => {
      pets_collection.pets.push({
        _id: pet.id,
        name: pet.species.name,
      })
      if ('is_active' in pet) {
        if ('name' in pet) hash_a.push(pet.name);
        hash_a.push(pet.species.name, pet.level.toString());
      }
      if ('name' in pet) hash_b.push(pet.name);
      hash_b.push(pet.species.name, pet.level.toString());
    })
    if (hash_b.length) pets_collection.hash.a = crc32.calculate(Buffer.from(hash_b.toString())).toString(16);
    if (hash_a.length) pets_collection.hash.b = crc32.calculate(Buffer.from(hash_a.toString())).toString(16);
    return pets_collection
  } catch (error) {
    console.error(`E,updatePets,${error}`)
    return {}
  }
}

module.exports = updatePets;

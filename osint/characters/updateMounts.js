
async function updateMounts (name, realm, BlizzAPI) {
  try {
    const mounts_collection = {
      mounts: [],
    };
    const response = await BlizzAPI.query(`/profile/wow/character/${realm}/${name}/collections/mounts`, {
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'profile-eu' }
    })
    if (!response || !response.mounts || !response.mounts.length) return mounts_collection
    const { mounts } = response;
    mounts.map(mount => {
      mounts_collection.pets.push({
        _id: mount.id,
        name: mount.name
      })
    })
    return mounts_collection
  } catch (error) {
    console.error(`E,updateMounts,${error}`)
    return {}
  }
}

module.exports = updateMounts;

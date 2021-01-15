/**
 * Mongo Models
 */
require('../db/connection');
const keys_db = require('../db/models/keys_db');

const createKeys = async () => {
  try {
    await keys_db.create({
      _id: '797923523913187338',
      secret: 'qyRYxAfQ6Wtgpofz4LBP',
      token: 'Nzk3OTIzNTIzOTEzMTg3MzM4.X_tj2w.JoqPua1xYeDKPE3SSanwLazp6tk',
      tags: ['discord','gossip'],
    })
  } catch (error) {
    console.error(`E,${createKeys.name},${error}`)
  }
}

createKeys();

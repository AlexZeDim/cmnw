import '../db/mongo/connection';
import { queueRealms } from "./osint.queue";
import { getRealmsWarcraftLogsID } from "./getters";
import { KeysModel } from '../db/mongo/models/keys.model';
import BlizzAPI from "blizzapi";

const indexRealms = async () => {
  try {
    const key = await KeysModel.findOne({ tags: `index.realms` });
    if (!key || !key.token) return

    const api = new BlizzAPI({
      region: 'eu',
      clientId: key._id,
      clientSecret: key.secret,
      accessToken: key.token
    });
    const [ realm_list, wcl_ids ] = await (Promise as any).allSettled([
      await api.query(`/data/wow/realm/index`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      }),
      await getRealmsWarcraftLogsID(247, 517)
    ])

    if (realm_list && realm_list.status === 'fulfilled') {
      if (!realm_list.value.realms || !Array.isArray(realm_list.value.realms)) return
        for (const { id, name, slug } of realm_list.value.realms) {
          await queueRealms.add(slug, {
            _id: id,
            name: name,
            slug: slug,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token,
            population: true,
            wcl_ids: wcl_ids.value //FIXME value can be undefined
          });
        }
    }
  } catch (e) {
    console.error(`E,${indexRealms.name}:${e}`)
  } finally {
    process.exit(0)
  }
}

indexRealms();

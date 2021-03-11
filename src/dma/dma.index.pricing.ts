import '../db/mongo/mongo.connection';
import {KeysModel} from "../db/mongo/mongo.model";
import { ExpansionTicker, RecipeProps } from "../interface/constant";
import BlizzAPI from "blizzapi";

const indexPricing = async () => {
  const key = await KeysModel.findOne({ tags: 'BlizzardAPI' });
  if (!key) return

  const api = new BlizzAPI({
    region: 'eu',
    clientId: key._id,
    clientSecret: key.secret,
    accessToken: key.token
  });

  const { professions } = await api.query(`/data/wow/profession/index`, {
    timeout: 10000,
    headers: { 'Battlenet-Namespace': 'static-eu' }
  });

  for (let profession of professions) {
    const { skill_tiers } = await api.query(`/data/wow/profession/${profession.id}`, {
      timeout: 10000,
      headers: { 'Battlenet-Namespace': 'static-eu' }
    });
    if (!skill_tiers) continue;
    for (let tier of skill_tiers) {
      let expansion_ticker: string = 'CLSC';
      Array.from(ExpansionTicker.entries()).some(([k, v]) => {
        tier.name.en_GB.includes(k) ? (expansion_ticker = v) : '';
      });
      const { categories } = await api.query(`/data/wow/profession/${profession.id}/skill-tier/${tier.id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      })
      if (!categories) continue;
      for (let category of categories) {
        const { recipes } = category;
        if (!recipes) continue;
        for (let recipe of recipes) {
          //TODO getter

        }
      }
    }
  }
}

indexPricing()

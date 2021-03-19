import '../db/mongo/mongo.connection';
import BlizzAPI from "blizzapi";
import { crc32 } from '@node-rs/crc32';
import { updateCharacterSummary, updateCharacterMedia } from "./osint.getter";
import {ObjectProps} from "../interface/constant";
import {queueRealms} from "./osint.queue";
import {getLookingForGuild} from "./osint.getter";

(async function f(realm_slug: string = 'gordunni', name_slug: string = 'инициатива'): Promise<void> {
  try {
    await getLookingForGuild()
  } catch (e) {
    console.error(e)
  }
})()

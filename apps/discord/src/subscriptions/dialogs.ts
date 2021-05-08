import { join } from 'path';
import { readFileSync } from 'fs';
import {
  DiscordInterface,
  ERROR_REALM,
  LANG,
  NOTIFICATIONS,
  QUESTIONS, REALM_LOCALE,
  SUBSCRIPTION_INTRO,
  WELCOME_FAMILIAR,
  WELCOME_FIRST_TIME,
} from '@app/core';
import { Realm } from '@app/mongo';
import { LeanDocument } from 'mongoose';

export function sayHello(username: string, first: boolean): string {
  return `Greetings / Привет ${username}\n ${(first) ? (WELCOME_FIRST_TIME) : (WELCOME_FAMILIAR)}${SUBSCRIPTION_INTRO}`
}

export function subscriptionScene({ current, reply, language, route, index, next, type }: DiscordInterface): Partial<DiscordInterface> {
  switch (current) {
    case 0:
      if (reply === 'русский') {
        const { question } = QUESTIONS.find(q => q.id === 1 && q.language === LANG.RU)
        return { language: LANG.RU, next: 1, question: question }
      }
      if (reply === 'english') {
        const { question } = QUESTIONS.find(q => q.id === 1 && q.language === LANG.EN)
        return { language: LANG.EN, next: 1, question: question }
      }
      return {}
    case 1:
      if (Object.values(NOTIFICATIONS).includes(reply as NOTIFICATIONS)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[reply][index+1])
        return { type: reply as NOTIFICATIONS, index: index + 1, prev: next, next: id, question: question }
      }
      return {};
    case 2:
      const realmsJson = readFileSync(join(__dirname, '..', '..', '..', './config/realms.json'), 'utf8');
      const { realms } = JSON.parse(realmsJson) as { realms: LeanDocument<Realm>[] };
      if (realms.length) {
        const { connected_realms_ids } = findRealm(reply, realms);
        console.log(connected_realms_ids);
        const connected_realms = connected_realms_ids.map(realm => ({ _id: realm, auctions: 0, golds: 0, valuations: 0 }));
        console.log(connected_realms);
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1, realms: connected_realms }
      }
      return { question: ERROR_REALM[language]};
  }
}

export function findRealm(find: string, realms: LeanDocument<Realm>[]) {
  const query = find.split(',').map(s => new RegExp(s.trim().toLowerCase()));
  let locale: boolean = false;
  const match = new Set();
  let naming: string = '';
  if (query.length === 1 && query[0].test('europe')) {
    realms.map(realm => match.add(realm.connected_realm_id));
    return { connected_realms_ids: Array.from(match) as number[], naming: realms.map(realm => `, ${realm.connected_realms.join(', ')}`).join(', ').substring(2) }
  }
  for (const regexp of query) {
    const realms_locale = regexp.source;
    if (REALM_LOCALE.includes(realms_locale)) {
      locale = true;
    }
    for (const realm of realms) {
      if (locale) {
        if (regexp.test(realm.locale.toLowerCase())) {
          match.add(realm.connected_realm_id);
          naming = naming.concat(`, ${realm.connected_realms.join(', ')}`);
        }
      } else {
        if (regexp.test(realm.slug)) {
          match.add(realm.connected_realm_id);
          naming = naming.concat(`, ${realm.connected_realms.join(', ')}`);
          break;
        } else if (regexp.test(realm.name.toLowerCase())) {
          match.add(realm.connected_realm_id);
          naming = naming.concat(`, ${realm.connected_realms.join(', ')}`);
          break;
        } else if (regexp.test(realm.name_locale.toLowerCase())) {
          match.add(realm.connected_realm_id);
          naming = naming.concat(`, ${realm.connected_realms.join(', ')}`);
          break;
        } else if (regexp.test(realm.slug_locale)) {
          match.add(realm.connected_realm_id);
          naming = naming.concat(`, ${realm.connected_realms.join(', ')}`);
          break;
        }
      }
    }
  }
  return { connected_realms_ids: Array.from(match) as number[], naming: naming.substring(2) }
}

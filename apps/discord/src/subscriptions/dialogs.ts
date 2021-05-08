import { join } from 'path';
import { readFileSync } from 'fs';
import {
  CHARACTER_CLASS,
  DiscordInterface,
  ERROR_REALM, FACTION,
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

export function subscriptionScene({ current, reply, language, route, index, next, type, actions }: DiscordInterface): Partial<DiscordInterface> {
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
        const connected_realms = connected_realms_ids.map(realm => ({ _id: realm, auctions: 0, golds: 0, valuations: 0 }));
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1, realms: connected_realms }
      }
      return { question: ERROR_REALM[language]};
    case 100:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (actions.russian.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { languages: ['russian'], question: question, prev: next, next: id, index: index + 1 }
      }
      if (actions.english.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { languages: ['english'], question: question, prev: next, next: id, index: index + 1 }
      }
      if (actions.languages.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { languages: [reply], question: question, prev: next, next: id, index: index + 1 }
      }
      return {};
    case 101:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      } else {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        const class_filter = reply.split(',').filter(s => {
          const character_class = s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
          if (CHARACTER_CLASS.includes(character_class)) return character_class
        })
        if (!class_filter.length) return {}
        return { character_class: class_filter, question: question, prev: next, next: id, index: index + 1 }
      }
    case 102:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (actions.alliance.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { faction: FACTION.A, question: question, prev: next, next: id, index: index + 1 }
      }
      if (actions.horde.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { faction: FACTION.H, question: question, prev: next, next: id, index: index + 1 }
      }
      return {}
    case 103:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (!isNaN(Number(reply))) {
        const item_level = parseInt(reply)
        if (item_level > 150 && item_level < 500) {
          const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
          return { average_item_level: item_level, question: question, prev: next, next: id, index: index + 1 }
        }
      }
      return {}
    case 104:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (!isNaN(Number(reply))) {
        const wcl_perf = parseInt(reply)
        if (wcl_perf > 9 && wcl_perf < 90) {
          const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
          return { wcl_percentile: wcl_perf, question: question, prev: next, next: id, index: index + 1 }
        }
      }
      return {}
    case 105:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (!isNaN(Number(reply))) {
        const raider_io = parseInt(reply)
        if (raider_io > 99 && raider_io < 10001) {
          const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
          return { rio_score: raider_io, question: question, prev: next, next: id, index: index + 1 }
        }
      }
      return {}
    case 106:
      if (actions.skip.includes(reply)) {
        const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
        return { question: question, prev: next, next: id, index: index + 1 }
      }
      if (!isNaN(Number(reply))) {
        const days_from = parseInt(reply)
        if (days_from > 0 && days_from < 8) {
          const { id, question } = QUESTIONS.find(q => q.language === language && q.id === route[type][index+1])
          return { days_from, question: question, prev: next, next: id, index: index + 1 }
        }
      }
      return {}
    case 107:
      if (actions.skip.includes(reply)) {
        return { prev: next, next: 1000, index: index }
      }
      if (!isNaN(Number(reply))) {
        const days_to = parseInt(reply)
        if (days_to > 1 && days_to < 8) {
          return { days_to, prev: next, next: 1000, index: index }
        }
      }
      return {}
    case 200:
      const items = reply.split(',').map(Number).filter(Boolean);
      if (!items.length ) return {}
      if (items.length > 10) return {}
      return { items, prev: next, next: 1000, index: index }
    default:
      return {}
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

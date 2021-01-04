const items_db = require('../../db/models/items_db');
const realms_db = require('../../db/models/realms_db');
const { questions } = require('./questions');

const subscriptionWizard = async ({ current, next, type, index, reply, route, lang, filters }) => {
  try {
    switch (current) {
      case 0:
        if (reply === 'русский') {
          const { question } = questions.find(q => q.id === 1 && q.lang === 'rus')
          return { lang: 'rus', next: 1, question: question }
        }
        if (reply === 'english') {
          const { question } = questions.find(q => q.id === 1 && q.lang === 'eng')
          return { lang: 'eng', next: 1, question: question }
        }
        return {}
      case 1:
        if (['recruiting', 'orders', 'marketdata'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[reply][index+1])
          return { type: reply, index: index + 1, prev: next, next: id, question: question }
        }
        return {};
      case 2:
        const realms = await realms_db.find({ $text: { $search: reply } }, { _id: 1 }).lean()
        if (realms.length) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          filters.realms = realms.map(({ _id }) => _id);
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
        return { question: (lang === 'eng') ? ('Seems like no realms have been found, try again in a different way, please.') : ('Похоже что ни один сервер не найден, попробуй ещё раз, только чуть по-другому.')};
      case 100:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (['русский', 'russian'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          filters.language = 'russian';
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
        if (['английский', 'english'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          filters.language = 'english';
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
        return {};
      case 101:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        } else {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          const playable_class = [
            'Warrior',
            'Paladin',
            'Hunter',
            'Rogue',
            'Priest',
            'Death Knight',
            'Shaman',
            'Mage',
            'Warlock',
            'Monk',
            'Druid',
            'Demon Hunter'
          ];
          const class_filter = reply.split(',').map(s => {
            const character_class = s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
            if (playable_class.includes(character_class)) return character_class
          })
          if (!class_filter.length) return {}
          filters.character_class = class_filter
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
      case 102:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (['альянс', 'alliance'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          filters.faction = 'Alliance';
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
        if (['орда', 'horde'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          filters.faction = 'Horde';
          return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
        }
        return {}
      case 103:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (!isNaN(reply)) {
          const item_level = parseInt(reply)
          if (item_level > 150 && item_level < 500) {
            const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
            filters.item_level = item_level;
            return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
          }
        }
        return {}
      case 104:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (!isNaN(reply)) {
          const wcl_perf = parseInt(reply)
          if (wcl_perf > 9 && wcl_perf < 90) {
            const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
            filters.wcl = wcl_perf;
            return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
          }
        }
        return {}
      case 105:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (!isNaN(reply)) {
          const raider_io = parseInt(reply)
          if (raider_io > 99 && raider_io < 10001) {
            const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
            filters.rio = raider_io;
            return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
          }
        }
        return {}
      case 106:
        if (['пропустить', 'skip'].includes(reply)) {
          const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
          return { question: question, prev: next, next: id, index: index + 1 }
        }
        if (!isNaN(reply)) {
          const days_from = parseInt(reply)
          if (days_from > 0 && days_from < 8) {
            const { id, question } = questions.find(q => q.lang === lang && q.id === route[type][index+1])
            filters.days_from = days_from;
            return { filters: filters, question: question, prev: next, next: id, index: index + 1 }
          }
        }
        return {}
      case 107:
        if (['пропустить', 'skip'].includes(reply)) {
          return { prev: next, next: 1000, index: index }
        }
        if (!isNaN(reply)) {
          const days_to = parseInt(reply)
          if (days_to > 1 && days_to < 8) {
            filters.days_from = days_to;
            return { filters: filters, prev: next, next: 1000, index: index }
          }
        }
        return {}
      case 200:
        const items = reply.split(',').map(Number).filter(Boolean).map(x => parseInt(x));
        if (!items.length) return {}
        const filter_items = await items_db.find({ _id: { $in: items } }, { _id: 1 }).lean();
        if (!filter_items.length) return {}
        filters.items = filter_items.map(({ _id }) => _id)
        return { filters: filters, prev: next, next: 1000, index: index }
      default:
        return {}
    }
  } catch (error) {
    console.error(`E,${subscriptionWizard.name}:${error}`)
  }
}

module.exports = { subscriptionWizard };

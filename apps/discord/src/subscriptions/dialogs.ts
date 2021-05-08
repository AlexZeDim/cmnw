import { DiscordInterface, LANG, NOTIFICATIONS, QUESTIONS } from '@app/core';

async function subscriptionScene({ current, reply, language, route, index, next, }: DiscordInterface): Promise<Partial<DiscordInterface>> {
  try {
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
    }
  } catch (e) {

  }
}

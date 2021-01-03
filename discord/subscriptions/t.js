const t = async (iteration, reply) => {
  const english_questions = [
    'Okay, fine. First of all, let\'s start with the subscription type: should it look for new \`recruiting\` candidates in WoWProgress queue?\n' +
    'Maybe watch for aggregated data about \`orders\` on the auction house? \n' +
    'Or what about full \`t&s\` (*time and sales*) information?\n' +
    'The choice is yours, but accepted only one of them: \`recruiting\`, \`orders\`, \`t&s\`',

    'Must-have-argument! Realms. Where are we going to find? You could name any realms you want via comma on any language you want \n' +
    'Or you could type language locale group or entire region name and include search on all realms available. Don\'t worry about connected realms, our bot always knows about them and works correctly.\n' +
    'Available examples, for realm or realms: \`silvermoon\`, \`tarren mill, kazzak\` \n' +
    'For language locale group(s): \`en_GB\`, \`en_GB, de_DE\` ' +
    'Within the entire region: \`Europe\` \n',

    'You can\'t filter by playing spec or role, but you can filter by class.\n' +
    '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!**\n' +
    'Just type playing classes via comma: \`rogue\`, \`rogue, priest, mage, warrior, death knight, demon hunter, shaman, warlock, hunter, paladin, monk\` or \`skip\`',

    'Hm, recruiting, nice choice! :hugging: So let\'s start with query parameters. What language your candidates should know before joining your guild?\n' +
    '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!**\n' +
    'Available parameters are: \`russian\`, \`english\` or \`skip\`',

    'What about faction? Should they be **for the horde!** or **for the alliance**? Or maybe **for azeroth**?\n' +
    '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!**\n' +
    'Accepted parameters are: \`alliance\`, \`horde\`, \`skip\`',

    'Should we filter characters by item level? Yes, we can. \n' +
    'If you want it too, just enter item level number, that should be between 150 and 500, **or use \`skip\` command if you don\'t need it.**',

    'Just four words, *Mythic Logs Average Performance*. Yes! It is average value (from all mythic bosses of actual raid) of main benchmark from Kihra\'s WarcraftLogs. Absolutely crazy feature. Should we use it?\n' +
    'To add, just enter number between 10 and 89, don\'t even ask why! **Or skip this feature by \`skip\` command.**',

    'RaiderIO M+ score? Yes or no? If yes, just enter necessary value between 100 and 10000. **Or \`skip\` this filter**',

    'Not everyone playing R.W.F. style 24/7. *And not everyone write their preferred raid time on wowprogress*. But you can filter by them, if they have been declared.\n' +
    'So, what are you waiting for, enter minimum preferred raid days for candidate **or just \`skip\` it?**'
  ]

  const russian_questions = [
    'Хорошо, давай же приступим. Какой тип подписки ты пожелаешь выбрать? Будем искать новых рекрутов на WoWProgress? Это команда \`recruiting\`\n' +
    'Или отправимся на аукцион, что бы отслеживать агрегированные данные по выбранным предметам? Тут тебе поможет команда \`orders\` \n' +
    'Или быть может нужен полный ответ вроде time and sales? Используй \`t&s\`! \n' +
    'Выбор за тобой, однако в качестве ответа будет принята только одна из трех команд',

    'Самый-главный-параметр! Сервера. Где мы будем искать? Можно перечислять сервера через запятую на любом доступном языке.\n' +
    'А можно сразу написать название региона или языковой группы. А бот сразу поймет, о каком сервере или соединенных серверах идет речь.\n' +
    'Доступные примеры, индивидуально, для серверов: \`гордунни\`, \`гордунни, ревущий фьорд\` \n' +
    'Для языковой группы, *только на английском*: \`ru_RU\`, \`ru_RU, en_GB\` \n' +
    'Поиск по всему региону, *только на английском*: \`Europe\` ',

    'Фильтровать персонажей по роли или спеку к сожалению нельзя, а вот по игровому классу, — можно! \n' +
    'Можно перечислить необходимые классы через запятую, (*только по английски*): \`rogue\`, \`rogue, priest, mage, warrior, death knight, demon hunter, shaman, warlock, hunter, paladin, monk\` или \`пропустить\`',

    'Хм, рекрутинг, отличный выбор! :hugging: Думаю нам стоит начать с поисковых параметров: на каком языке должны говорить твои кандидаты?\n' +
    '**Этот параметр опциональный и его можно \`пропустить\` и тогда поиск будет выполняться по всем критериям!**\n' +
    'Доступные параметры: \`русский\`, \`английский\` или \`пропустить\`',

    'Что там насчет фракции? Ищем кандидатов **За орду!** или **За альянс**? Или может быть по обе стороны?\n' +
    '**Этот параметр опциональный и его можно \`пропустить\` и тогда поиск будет выполняться по всем критериям!**\n' + +
    'Принимаемые параметры: \`альянс\`, \`орда\`, \`пропустить\`',

    'Что там по уровню предметов персонажа? Будем фильтровать? \n' +
    'Если да, то введи необходимое число от 150 до 500 или же **используй \`пропустить\` если в этом нет нужды**',

    'У меня есть четыре заманчивых слова: *Анализ перфоманса эпохальных логов*. Да, все верно, это основной показатель персонажей (среднее значение со всех эпохальных боссов в актуальном рейде) на WarcraftLogs\n' +
    'Что бы включить этот фильтр введите число от 10 до 89. Даже не спрашивайте почему так! Если для это слишком сложно **можно использовать команду \`пропустить\`**',

    '#Риоестдетей. Фильтруем по RaiderIO M+ скору? Если да, то введи число от 100 до 10000 или введи \`пропустить\` если это уже слишком',

    'Не все игроки играют 24/7. *Как и не все указывают время в анкете*. Но если они есть, то можно фильтровать и по ним.\n' +
    'Ну так что? Введи минимальное количество дней РТ для кандидатов **или же опять \`пропустить\`?**',

    'Ой, а что насчет максимального количества доступных дней на РТ? Тут всё тоже самое... \n' +
    'Введи максимальное количество дней РТ для кандидатов или впиши опять \`пропустить\`',
  ]

  try {
    switch (iteration) {
      case 0:
        if (['y', 'yes', 'true', 'да'].includes(reply)) {
          return { iteration: iteration + 1, question: english_questions[iteration] }
        }
        break;
      default:
        return { iteration: iteration }
    }
  } catch (e) {

  }
}

module.exports = { t };

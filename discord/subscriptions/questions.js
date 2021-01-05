const questions = [
  {
    id: 1,
    lang: 'eng',
    answers: [],
    question: 'Okay, fine. First of all, let\'s start with the subscription type: should it look for new \`recruiting\` candidates in WoWProgress queue?\n' +
      'Maybe watch for aggregated \`marketdata\` on the auction house? \n' +
      'Or what about full \`orders\` (*time and sales*) information?\n' +
      'The choice is yours, but accepted only one of them: \`recruiting\`, \`marketdata\`, \`orders\`'
  },
  {
    id: 1,
    lang: 'rus',
    question: 'Хорошо, давай же приступим. Какой тип подписки ты пожелаешь выбрать? Будем искать новых рекрутов на WoWProgress? Это команда \`recruiting\`\n' +
      'Или отправимся на аукцион, что бы отслеживать агрегированные данные по выбранным предметам? Тут тебе поможет команда \`marketdata\` \n' +
      'Или быть может нужен полный ответ вроде time and sales? Используй \`orders\`! \n' +
      'Выбор за тобой, однако в качестве ответа будет принята только одна из трех команд'
  },
  {
    id: 2,
    lang: 'eng',
    question: 'Must-have-argument! Realms. Where are we going to find? You could name any realms you want via comma on any language you want \n' +
      'Or you could type language locale group or entire region name and include search on all realms available. Don\'t worry about connected realms, our bot always knows about them and works correctly.\n' +
      'Available examples, for realm or realms: \`silvermoon\`, \`tarren mill, kazzak\` \n' +
      'For language locale group(s): \`en_GB\`, \`en_GB, de_DE\` \n' +
      'Within the entire region: \`Europe\`'
  },
  {
    id: 2,
    lang: 'rus',
    question: 'Самый-главный-параметр! Сервера. Где мы будем искать? Можно перечислять сервера через запятую на любом доступном языке.\n' +
      'А можно сразу написать название региона или языковой группы. А бот сразу поймет, о каком сервере или соединенных серверах идет речь.\n' +
      'Доступные примеры, индивидуально, для серверов: \`гордунни\`, \`гордунни, ревущий фьорд\` \n' +
      'Для языковой группы, *только на английском*: \`ru_RU\`, \`ru_RU, en_GB\` \n' +
      'Поиск по всему региону, *только на английском*: \`Europe\` '
  },
  {
    id: 100,
    lang: 'eng',
    question: 'Hm, recruiting, nice choice! :hugging: So let\'s start with query parameters. What language your candidates should know before joining your guild?\n' +
      '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!**\n' +
      'Available parameters are: \`russian\`, \`english\`, \`german, french, greek, spanish, polish\` any single one that WoWProgress profile supports or \`skip\`'
  },
  {
    id: 100,
    lang: 'rus',
    question: 'Рекрутинг, отличный выбор! :hugging: Думаю нам стоит начать с поисковых параметров: на каком языке должны говорить твои кандидаты?\n' +
      '**Этот параметр опциональный и его можно \`пропустить\` и тогда поиск будет выполняться по всем критериям!**\n' +
      'Доступные параметры: \`русский\`, \`английский\` или \`пропустить\`'
  },
  {
    id: 101,
    lang: 'eng',
    question: 'You can\'t filter by playing spec or role, but you can filter by class.\n' +
      '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!**\n' +
      'Just type playing classes via comma: \`rogue\`, \`rogue, priest, mage, warrior, death knight, demon hunter, shaman, warlock, hunter, paladin, monk\` or \`skip\`'
  },
  {
    id: 101,
    lang: 'rus',
    question: 'Фильтровать персонажей по роли или спеку к сожалению нельзя, а вот по игровому классу, — можно! \n' +
      'Можно перечислить необходимые классы через запятую, (*только по английски*): \`rogue\`, \`rogue, priest, mage, warrior, death knight, demon hunter, shaman, warlock, hunter, paladin, monk\` или \`пропустить\`',
  },
  {
    id: 102,
    lang: 'eng',
    question: 'What about faction? Should they be **for the horde!** or **for the alliance**? Or maybe **for azeroth**?\n' +
      '**This parameter is optional and can be skipped! In that case the search will completed by every criteria!** \n' +
      'Accepted parameters are: \`alliance\`, \`horde\`, \`skip\`'
  },
  {
    id: 102,
    lang: 'rus',
    question: 'Что там насчет фракции? Ищем кандидатов **За орду!** или **За альянс**? Или может быть по обе стороны?\n' +
      '**Этот параметр опциональный и его можно \`пропустить\` и тогда поиск будет выполняться по всем критериям!** \n' +
       'Принимаемые параметры: \`альянс\`, \`орда\`, \`пропустить\`'
  },
  {
    id: 103,
    lang: 'eng',
    question: 'Should we filter characters by item level? Yes, we can. \n' +
      'If you want it too, just enter item level number, that should be between 150 and 500, **or use \`skip\` command if you don\'t need it.**',
  },
  {
    id: 103,
    lang: 'rus',
    question: 'Что там по уровню предметов персонажа? Будем фильтровать? \n' +
      'Если да, то введи необходимое число от 150 до 500 или же **используй \`пропустить\` если в этом нет нужды**',
  },
  {
    id: 104,
    lang: 'eng',
    question: 'Just four words, *Mythic Logs Average Performance*. Yes! It is average value (from all mythic bosses of actual raid) of main benchmark from Kihra\'s WarcraftLogs. Absolutely crazy feature. Should we use it?\n' +
      'To add, just enter number between 10 and 89, don\'t even ask why! **Or skip this feature by \`skip\` command.**',
  },
  {
    id: 104,
    lang: 'rus',
    question: 'У меня есть четыре заманчивых слова: *Анализ перфоманса эпохальных логов*. Да, все верно, это основной показатель персонажей (среднее значение со всех эпохальных боссов в актуальном рейде) на WarcraftLogs.\n' +
      'Что бы включить этот фильтр введите число от 10 до 89. Даже не спрашивай почему так! Если для тебя это кажется сложным **используй команду \`пропустить\`**'
  },
  {
    id: 105,
    lang: 'eng',
    question: 'RaiderIO M+ score? Yes or no? If yes, just enter necessary value between 100 and 10000. **Or \`skip\` this filter**',
  },
  {
    id: 105,
    lang: 'rus',
    question: '#Риоестдетей. Фильтруем по RaiderIO M+ скору? Если да, то введи число от 100 до 10000 **или введи \`пропустить\` если это уже слишком...**',
  },
  {
    id: 106,
    lang: 'eng',
    question: 'Not everyone playing R.W.F. style 24/7. *And not everyone write their preferred raid time on wowprogress*. But you can filter by them, if they have been declared.\n' +
      'So, what are you waiting for, enter minimum preferred raid days between 1 and 7 for candidate **or just \`skip\` it?**'
  },
  {
    id: 106,
    lang: 'rus',
    question: 'Не все игроки играют 24/7. *Как и не все указывают время в анкете*. Но если они есть, то можно фильтровать и по ним.\n' +
      'Ну так что? Введи минимальное количество дней РТ для кандидатов от 1 до 7 **или же опять \`пропустить\`?**'
  },
  {
    id: 107,
    lang: 'eng',
    question: 'Oh, and what about maximum acceptable raid days? Same as before, just enter number between 2 and 7 **or just \`skip\` it**',
  },
  {
    id: 107,
    lang: 'rus',
    question: 'Ой, а что насчет максимального количества доступных дней на РТ? Тут всё тоже самое... \n' +
      'Введи максимальное количество дней РТ для кандидатов от 2 до 7 **или впиши опять \`пропустить\`**',
  },
  {
    id: 200,
    lang: 'eng',
    question: 'And now we need items, but not just items, but their **IDs**. Like previous steps with realms.\n' +
      'For example: \`142085\`. Or don\'t be shy to use an array of values like \`183017, 183035, 182978\` Come on, only imaging tracking every BoS.. '
  },
  {
    id: 200,
    lang: 'rus',
    question: 'А теперь нам нужны предметы, но сами они конечно, а их **ID**, Здесь всё точно так же, как и с серверами \n' +
      'Например: \`142085\`. Или можно не стесняться и вписать сразу все ID через запятую: \`183017, 183035, 182978\`, ты и представить себе не можешь, как удобно отслеживать и выкупать все BoE на аукционе..'
  }
]

module.exports = { questions };

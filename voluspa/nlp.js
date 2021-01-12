const { NlpManager } = require('node-nlp');

(async () => {
  const manager = new NlpManager({ languages: ['ru'] });
  manager.addNamedEntityText(
    'character',
    'Альвеона',
    ['ru'],
    ['альвеона', 'альвеоняша'],
  );
  manager.addNamedEntityText(
    'character',
    'Нюрс',
    ['ru'],
    ['нюрс', 'нюрсеос', 'Нюрс', 'Нюрса'],
  );
  manager.addNamedEntityText(
    'guild',
    'Экзорсус',
    ['ru'],
    ['экзорсус', 'экзоги'],
  );
  manager.addDocument('ru', '%guild% развалилась', 'disband');
  manager.addDocument(
    'ru',
    '%character% кикнут из %guild%',
    'kick',
  );
  manager.addDocument(
    'ru',
    '%character% кикнули из %guild%',
    'kick',
  );
  await manager.train();
  manager
    .process('Я видел как Нюрса кикнули из Экзорсуса')
    .then(result => console.log(result));
})();

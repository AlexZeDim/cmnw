const Discord = require('discord-voluspa');

const bot = new Discord.Client();


//TESSIE Nzk3OTIzNTIzOTEzMTg3MzM4.X_tj2w.JoqPua1xYeDKPE3SSanwLazp6tk
//GOSSIP NzI3NjIyMDg2MzYwNjk0ODc1.XzCMuw.DllkWDlms4u0g7iLcyoRyXqjgwQ

bot.login("Nzk3OTIzNTIzOTEzMTg3MzM4.X_tj2w.JoqPua1xYeDKPE3SSanwLazp6tk").then(r => r);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  /*const guild = bot.guilds.array().find(({name}) => name === 'BURROW OF MUFFINS');
  const channel = guild.channels.find(({id}) => id === '734001596849192964');
  const m = new Discord.RichEmbed();
  m.setAuthor('You are one')
  m.setTitle('BUT WE ARE MANY')
  m.setColor('LIGHT_GREY')
  m.addField('The New Era', 'Has begun')
  m.addField('Supremacy', 'Have been achieved')
  channel.send(m)*/
});

bot.on('message', async message => {
  console.log(message.content)
})



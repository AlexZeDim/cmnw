const Discord = require('discord-voluspa');

const bot = new Discord.Client();

//TESSIE Nzk3OTIzNTIzOTEzMTg3MzM4.X_tj2w.JoqPua1xYeDKPE3SSanwLazp6tk
//GOSSIP NzI3NjIyMDg2MzYwNjk0ODc1.XzCMuw.DllkWDlms4u0g7iLcyoRyXqjgwQ

bot.login("Nzk3OTIzNTIzOTEzMTg3MzM4.X_tj2w.JoqPua1xYeDKPE3SSanwLazp6tk").then(r => r);

bot.on('ready', () => console.log(`Logged in as ${bot.user.tag}!`));

bot.on('message', async message => {
  console.log(message.content)
})

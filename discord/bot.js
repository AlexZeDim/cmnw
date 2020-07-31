require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Discord = require('discord.js');

const bot = new Discord.Client();
bot.commands = new Discord.Collection();

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

const commandFiles = fs.readdirSync(path.normalize(`${__dirname}/commands/`)).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.normalize(`${__dirname}/commands/${file}`));
    bot.commands.set(command.name, command);
}

bot.on('message', async message => {
    if (message.author.bot) return;
    let command = '';
    let args = '';
    if (message.content.startsWith('direct')) {
        command = message.content.split(/(?<=^\S+)@/)[0];
        args = message.content.split(/(?<=^\S+)@/)[1];
    } else {
        command = message.content.split(/(?<=^\S+)\s/)[0];
        args = message.content.split(/(?<=^\S+)\s/)[1];
    }
    if (!bot.commands.has(command)) return;
    try {
        bot.commands.get(command).execute(message, args, bot);
    } catch (error) {
        console.error(error);
        await message.reply('There was an error trying to execute that command!');
    }
});

bot.login(process.env.bluratella);
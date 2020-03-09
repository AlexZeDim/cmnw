require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync(path.normalize(`${__dirname}\\commands\\`)).filter(file => file.endsWith('.js'));

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

for (const file of commandFiles) {
    const command = require(path.normalize(`${__dirname}\\commands\\${file}`));
    client.commands.set(command.name, command);
}

client.on('message', async message => {
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
    if (!client.commands.has(command)) return;
    try {
        client.commands.get(command).execute(message, args, client);
    } catch (error) {
        console.error(error);
        await message.reply('there was an error trying to execute that command!');
    }
});

client.login(process.env.bluratella);
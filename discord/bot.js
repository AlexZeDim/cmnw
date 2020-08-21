require("dotenv").config();
const path = require("path");
const fs = require("fs");
const Discord = require("discord.js");

const bot = new Discord.Client();
bot.commands = new Discord.Collection();

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

const commandFiles = fs
  .readdirSync(path.normalize(`${__dirname}/commands/`))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.normalize(`${__dirname}/commands/${file}`));
  bot.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

bot.on("message", async (message) => {
  if (message.author.bot) return;

  let commandName = "";
  let args;

  if (message.content.startsWith("direct")) {
    commandName = message.content.split(/(?<=^\S+)@/)[0];
    args = message.content.split(/(?<=^\S+)@/)[1];
  } else {
    commandName = message.content.split(/(?<=^\S+)\s/)[0];
    args = message.content.split(/(?<=^\S+)\s/)[1];
  }

  let command =
    bot.commands.get(commandName) ||
    bot.commands.find(
      (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
    );

  if (!command) return;

  if (command.guildOnly && message.channel.type !== "text") {
    return message.reply("I can't execute that command inside DMs!");
  }

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${
          command.name
        }\` command.`
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    command.execute(message, args, bot);
  } catch (error) {
    console.error(error);
    await message.reply("There was an error trying to execute that command!");
  }
});

bot.login(process.env.bluratella);

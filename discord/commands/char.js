const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const humanizeString = require("humanize-string");
require("dotenv").config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: "char",
  description:
    "Return information about specific character. Example usage: `char блюрателла@гордунни`",
  aliases: ["character", "CHAR", "CHARACTER", "Character"],
  args: true,
  async execute(message, args) {
    const [name, realm] = args.split("@");
    let embed = new MessageEmbed();
    let character = await axios
      .get(
        encodeURI(
          `http://${process.env.localhost}:3030/api/characters/character/${name}@${realm}`
        )
      )
      .then(({ data }) => {
        let { _id, name, guild, realm } = data;
        if (guild) {
          let guild_string = guild.name.toString().toUpperCase();
          if (guild.rank) {
            guild_string = guild_string.concat(
              ` // ${guild.rank === 0 ? "GM" : "R" + guild.rank}`
            );
          }
          embed.setTitle(guild_string);
          embed.setURL(
            encodeURI(
              `https://${process.env.domain}/guild/${realm.slug}/${guild.name}`
            )
          );
        }
        embed.setAuthor(
          _id.toUpperCase(),
          "",
          encodeURI(
            `https://${process.env.domain}/character/${realm.slug}/${name}`
          )
        );

        const fieldsToCheck = [
          "id",
          "character_class",
          "spec",
          "level",
          "hash",
          "ilvl",
          "faction",
          "media",
          "race",
          "gender",
          "lastModified",
          "createdBy",
        ];

        fieldsToCheck.map((field) => {
          if (field in data) {
            if (typeof data[field] === "object") {
              if (field === "hash") {
                delete data[field].t;
              }
              if (field === "media") {
                embed.setThumbnail(data[field].avatar_url);
              } else {
                Object.entries(data[field]).map(([k, v]) => {
                  embed.addField(
                    `${humanizeString(field)} ${humanizeString(k)}`,
                    v,
                    true
                  );
                });
              }
            } else {
              if (field === "faction") {
                if (data[field] === "Alliance") {
                  embed.setColor("#006aff");
                } else if (data[field] === "Horde") {
                  embed.setColor("#ff0000");
                }
              } else if (field === "lastModified") {
                embed.setTimestamp(data[field]);
              } else if (field === "createdBy") {
                embed.setFooter(`${data[field]} | Gonikon`);
              } else {
                embed.addField(
                  humanizeString(field.replace("character_", "")),
                  data[field],
                  true
                );
              }
            }
          }
        });
        return embed;
      });
    await message.channel.send(character);
  },
};

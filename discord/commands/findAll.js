const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

//TODO

module.exports = {
    name: 'findAll',
    description: 'This command will find out all twinks for characters',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        let embed = new MessageEmbed();
        let character = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/findAll/${params[0]}@${params[1]}`)).then(({data}) => {
            console.log(data);
            let { _id, checksum, Hash_A } = data;
            embed.setTitle(_id.toUpperCase());
            embed.setURL('https://discord.js.org/');
            embed.setAuthor(checksum.pets, '', 'https://discord.js.org');
            for (let i = 0; i < Hash_A.length; i++) {
                let {guild, guild_rank} = Hash_A[i];
                embed.addField(`Match: ${i+1}`, `${Hash_A[i]._id}\n${guild} ,R${guild_rank}`, true);
            }
            return embed
        });
        await message.channel.send(character);
    },
};
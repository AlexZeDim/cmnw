module.exports = {
  name: 'joinme',
  description:
    'Join the voice room channel, where the author of this command is',
  aliases: ['JOINME'],
  async execute(message) {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
    }
  },
};

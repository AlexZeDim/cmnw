import axios from 'axios';
import qs from 'qs';
import { yandexConfig } from '@app/configuration';
import { delay } from '@app/core/utils/converters';
// import fs from 'fs-extra';
// import { OpusEncoder } from '@discordjs/opus';

module.exports = {
  name: 'say',
  description:
    'Join the voice room channel, where the author of this command is',
  aliases: ['say'],
  args: true,
  async execute(message, args, client) {
    const [text, channelId] = args.split('@');

    let channel = client.channels.cache.get(channelId);
    if (!channel || channel.type !== 'voice') {
      channel = message.member.voice.channel
    }
    if (channel) {
      const { data } = await axios({
        method: 'POST',
        url: 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
        headers: {
          'Authorization': `Api-Key ${yandexConfig.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify({
          'text': text, //Привет
          'lang': 'ru-RU', //ru-RU
          'voice': 'alena',
          'speed': 1.05
        }),
        responseType: 'stream',
      });

      const connection = await channel.join();

      const dispatcher = await connection.play(data, { type: 'ogg/opus' });

      dispatcher.on('start', () => {
        console.log('Now playing!');
      });

      // Always remember to handle errors appropriately!
      dispatcher.on('error', console.error);

      dispatcher.on('finish', () => {
        console.log('Finished playing!');
        dispatcher.destroy();
        connection.disconnect();
      });
    }
  },
};

import axios from 'axios';
import qs from 'qs';
import { yandexConfig } from '@app/configuration';
import { Client, Interaction, Message, VoiceChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Readable } from 'stream';
import {
  createAudioResource,
  StreamType,
  joinVoiceChannel,
  createAudioPlayer,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} from '@discordjs/voice';


module.exports = {
  name: 'voice',
  description:
    'Pronounce specific cyrrilic text in chat',
  aliases: ['Voice', 'VOICE'],
  args: true,
  inDevelopment: false,
  slashOnly: true,
  slashCommand: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Joins selected voice channel and pronounce provided cyrrilic text.')
    .addStringOption((option) =>
      option.setName('text')
        .setDescription('Any text phrase (сказать громко)')
        .setRequired(true))
    .addChannelOption((option) =>
      option.setName('destination')
        .setDescription('Select a channel')
        .setRequired(true)),

  async executeMessage(message: Message, args: string, client: Client): Promise<void> {
    const [text, channelId] = args.split('@');

    let channel = client.channels.cache.get(channelId);

    console.log(channel);

    if (!channel || channel.type !== 'GUILD_VOICE') {
      return;
      // TODO if member in voice chat channel = message.member.voice.channel
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
          'text': text, // Привет
          'lang': 'ru-RU', // ru-RU
          'voice': 'alena',
          'speed': 1.03
        }),
        responseType: 'stream',
      });

      // @ts-ignore
      const connection = await channel.join();

      const dispatcher = await connection.play(data, { type: 'ogg/opus' });

      dispatcher.on('start', () => {
        console.log('Now playing!');
      });

      dispatcher.on('error', console.error);

      dispatcher.on('finish', () => {
        console.log('Finished playing!');
        dispatcher.destroy();
        connection.disconnect();
      });
    }
  },

  async executeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const text: string = interaction.options.getString('text');
    const channel = interaction.options.getChannel('destination');

    if (channel.type === 'GUILD_VOICE') {
      const { data } = await axios({
        method: 'POST',
        url: 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
        headers: {
          'Authorization': `Api-Key ${yandexConfig.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify({
          'text': text, // Привет
          'lang': 'ru-RU', // ru-RU
          'voice': 'alena',
          'speed': 1.03
        }),
        responseType: 'stream',
      });

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: (channel as VoiceChannel).guildId,
        adapterCreator: (channel as VoiceChannel).guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      const player = createAudioPlayer();
      // An AudioPlayer will always emit an "error" event with a .resource property

      connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
        console.log('Connection is in the Ready state!');
      });

      player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
        console.log('Audio player is in the Playing state!');
      });

      player.on('error', error => {
        console.error('Error:', error.message, 'with track', error.resource.metadata);
      });

      const resource = createAudioResource(data as Readable, { inputType: StreamType.Arbitrary });

      player.play(resource);

      const subscription = connection.subscribe(player);
    }
  },
};

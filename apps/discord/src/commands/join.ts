import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Interaction, Snowflake, VoiceChannel } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { createListeningStream } from '../utils';

module.exports = {
  name: 'join',
  description:
    'Join specific voice channel',
  aliases: ['Voice', 'VOICE'],
  inDevelopment: true,
  args: true,
  slashOnly: true,
  slashCommand: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Joins selected voice channel')
    .addChannelOption((option) =>
      option.setName('destination')
        .setDescription('Select a channel')
        .setRequired(true))
    .addBooleanOption((option) =>
      option.setName('record')
        .setDescription('true'))
    .addBooleanOption((option) =>
      option.setName('recognize')
        .setDescription('true')),

  async executeInteraction(interaction: Interaction, client: Client): Promise<void> {
    if (!interaction.isCommand()) return;

    const channel = interaction.options.getChannel('destination');
    const record = interaction.options.getBoolean('record');
    const recognize = interaction.options.getBoolean('recognize');

    if (channel.type === 'GUILD_VOICE') {
      const connectionVoice = getVoiceConnection((channel as VoiceChannel).guildId);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: (channel as VoiceChannel).guildId,
        adapterCreator: (channel as VoiceChannel).guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      const recordable: Set<Snowflake> = new Set<Snowflake>();

      console.log(`record: ${record}, recognize: ${recognize}`);

      if (!!record) {
        const userId = interaction.options.get('speaker')!.value! as Snowflake;
        recordable.add(userId);

        const receiver = connection.receiver;

        if (connection.receiver.speaking.users.has(userId)) {
          createListeningStream(receiver, userId, client.users.cache.get(userId));
        }

        await interaction.reply({ ephemeral: true, content: 'Listening!' });
      }

      if (!!recognize) {

      }
    }
  }
}

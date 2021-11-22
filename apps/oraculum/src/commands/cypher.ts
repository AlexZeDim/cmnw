import { SlashCommandBuilder } from '@discordjs/builders';
import { ISlashCommandArgs } from '@app/core';
import { SHA1, SHA256, SHA512, SHA3, MD5, enc, AES } from 'crypto-js';

module.exports = {
  name: 'cypher',
  slashCommand: new SlashCommandBuilder()
    .setName('cypher')
    .setDescription('Cypher or decrypt the following string via provided algorithm')
    .addStringOption(option =>
      option.setName('cypher')
        .setDescription('Select function')
        .addChoice('Hex', 'hex')
        .addChoice('Base64', 'base64')
        .addChoice('MD5', 'md5')
        .addChoice('SHA-1', 'sha1')
        .addChoice('SHA-256', 'sha256')
        .addChoice('SHA-512', 'sha512')
        .addChoice('SHA-3', 'sha3')
        .addChoice('AES', 'aes')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('message')
        .setDescription('Enter message')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('decrypt')
        .setDescription('true to decrypt, false to encrypt')
        .setRequired(true)
    ),

  async executeInteraction({ interaction }: ISlashCommandArgs): Promise<void> {
    if (!interaction.isCommand()) return;

    try {

      const cypher: string = interaction.options.getString('cypher', true);
      const decrypt: boolean = interaction.options.getBoolean('decrypt', true);
      const message: string = interaction.options.getString('message', true);

      let text: string = message;

      switch (cypher) {
        case 'hex':
          decrypt
            ? text = new Buffer(message, 'hex').toString()
            : text = new Buffer(message).toString('hex')
          break;
        case 'base64':
          decrypt
            ? text = new Buffer(message, 'base64').toString('utf8')
            : text = new Buffer(message).toString('base64')
          break;
        case 'md5':
          text = MD5(message).toString(enc.Utf8);
          break;
        case 'sha1':
          text = SHA1(message).toString(enc.Utf8);
          break;
        case 'sha256':
          text = SHA256(message).toString(enc.Utf8);
          break;
        case 'sha512':
          text = SHA512(message).toString(enc.Utf8);
          break;
        case 'sha3':
          text = SHA3(message).toString(enc.Utf8);
          break;
        case 'aes':

          decrypt
            ? text = AES.encrypt(text, interaction.member.user.id).toString()
            : text = AES.decrypt(text, interaction.member.user.id).toString(enc.Utf8)
          break;
        default:
      }

      await interaction.reply({ content: text, ephemeral: true });
    } catch (errorOrException) {
      console.error(`invite: ${errorOrException}`);
    }
  }
}

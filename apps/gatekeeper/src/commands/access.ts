import { SlashCommandBuilder } from '@discordjs/builders';
import { Snowflake } from 'discord.js';
import { ISlashCommandArgs } from '@app/core';
import ms from 'ms';

module.exports = {
  name: 'access',
  slashCommand: new SlashCommandBuilder()
    .setName('access')
    .setDescription('Gives personal access via oracle network to specific Discord User')
    .addStringOption((option) =>
      option.setName('snowflake')
        .setDescription('895766801965785138')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('uses')
        .setDescription('5')
        .addChoice('1', 1)
        .addChoice('5', 5)
        .addChoice('10', 10)
        .addChoice('25', 25)
    )
    .addIntegerOption((option) =>
      option.setName('expire')
        .setDescription('895766801965785138')
        .addChoice('30 min', ms('30m'))
        .addChoice('1 hour', ms('1h'))
        .addChoice('6 hours', ms('6h'))
        .addChoice('12 hours', ms('12h'))
        .addChoice('24 hours', ms('1d'))
    ),

  async executeInteraction({ interaction, redis }: ISlashCommandArgs): Promise<void> {
    if (!interaction.isCommand()) return;

    const userId: Snowflake = interaction.options.getString('snowflake');

    let uses: number | undefined = interaction.options.getInteger('uses');
    if (uses) uses = 5;

    let expire: number | undefined = interaction.options.getInteger('expire');
    if (!expire) expire = ms('1d');

    // TODO create invite

    await redis.set('test', userId, 'EX', expire);
  }
}

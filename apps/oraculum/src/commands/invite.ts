import { SlashCommandBuilder } from '@discordjs/builders';
import { Snowflake, TextChannel, VoiceChannel } from 'discord.js';
import { ISlashCommandArgs, ORACULUM_COMMANDS } from '@app/core';
import { NotFoundException } from '@nestjs/common';
import ms from 'ms';

module.exports = {
  name: ORACULUM_COMMANDS.Invite,
  slashCommand: new SlashCommandBuilder()
    .setName(ORACULUM_COMMANDS.Invite)
    .setDescription('Gives personal access via oracle network to specific Discord User')
    .addStringOption((option) =>
      option.setName('user')
        .setDescription('895766801965785138')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('temporary')
        .setDescription('true')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('channel')
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

  async executeInteraction({ interaction, redis, discordCore }: ISlashCommandArgs): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      const targetUser: Snowflake = interaction.options.getString('user', true);

      const channel: Snowflake = interaction.options.getString('channel', true);

      let maxUses: number | undefined = interaction.options.getInteger('uses', false);
      if (maxUses) maxUses = 5;

      let maxAge: number | undefined = interaction.options.getInteger('expire', false);
      if (!maxAge) maxAge = ms('1d');

      const temporary: boolean = interaction.options.getBoolean('temporary', true);

      // FIXME replace channel for voice V
      const channelInvite: TextChannel | VoiceChannel | undefined  = await this.client.channels.fetch(channel);

      if (!channelInvite) throw new NotFoundException(`Channel ${channel} not found!`);

      const invite = await channelInvite.createInvite({
        maxUses,
        maxAge,
        temporary,
        targetUser,
      });

      const inviteJson = invite.toJSON() as string;
      // await redis.set(`ingress:${targetUser}`, invite.code, 'EX', maxAge);
      await redis.set(`ingress:${targetUser}`, inviteJson, 'EX', maxAge);
    } catch (errorOrException) {
      console.error(`${ORACULUM_COMMANDS.Invite}: ${errorOrException}`);
    }
  }
}

import { SlashCommandBuilder } from '@discordjs/builders';
import { Snowflake, TextChannel } from 'discord.js';
import { ISlashCommandArgs } from '@app/core';
import ms from 'ms';

module.exports = {
  name: 'invite',
  slashCommand: new SlashCommandBuilder()
    .setName('invite')
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
      option.setName('agent')
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

      const agent: Snowflake = interaction.options.getString('agent', true);

      let maxUses: number | undefined = interaction.options.getInteger('uses', false);
      if (maxUses) maxUses = 5;

      let maxAge: number | undefined = interaction.options.getInteger('expire', false);
      if (!maxAge) maxAge = ms('1d');

      const temporary: boolean = interaction.options.getBoolean('temporary', true);

      if (agent === this.client.user.id) {
        // FIXME replace channel
        const channel = await this.client.channels.fetch(discordCore.logs.ingress.id) as TextChannel;
        const invite = await channel.createInvite({
          maxUses,
          maxAge,
          temporary,
          targetUser,
        });

        await redis.set(`ingress:${targetUser}`, invite.code, 'EX', maxAge);
      } else {
        // TODO find channel and send command
        let channel = this.client.channels.cache.find(agent) as TextChannel;
        if (!channel) {
          // TODO throw error
          return;
        }

        await channel.send({ content: `invite ${targetUser} ${maxAge} ${maxUses} ${maxAge} ${temporary}`});
      }
    } catch (errorOrException) {
      console.error(`invite: ${errorOrException}`);
    }
  }
}

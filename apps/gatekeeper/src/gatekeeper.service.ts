import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Client, Collection, Intents, Interaction, Invite, MessageEmbed, TextChannel } from 'discord.js';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { DISCORD_CHANNEL_LOGS, DISCORD_CORE, IDiscordChannelLogs, IDiscordSlashCommand } from '@app/core';

import { Routes } from 'discord-api-types/v9';
import { REST } from '@discordjs/rest';
import fs from 'fs-extra';
import path from 'path';
import ms from 'ms';

@Injectable()
export class GatekeeperService implements OnApplicationBootstrap {

  private client: Client

  private readonly logger = new Logger(
    GatekeeperService.name, { timestamp: true },
  );

  private readonly rest = new REST({ version: '9' }).setToken('ODk1NzY2ODAxOTY1Nzg1MTM4.YV9V2A.Hp3oGeleAr6HE-F9sMxUhqJPlPQ');

  private commandSlash = [];

  private channelsLogs: Partial<IDiscordChannelLogs>;

  private commandsMessage: Collection<string, IDiscordSlashCommand> = new Collection();

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.loadCommands();

    await this.rest.put(
      Routes.applicationGuildCommands('895766801965785138', DISCORD_CORE),
      { body: this.commandSlash },
    );

    this.logger.log('Reloaded application (/) commands.');

    this.client = new Client({
      partials: ['USER', 'CHANNEL', 'GUILD_MEMBER'],
      intents: [
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
      presence: {
        status: 'online'
      }
    });

    await this.client.login('ODk1NzY2ODAxOTY1Nzg1MTM4.YV9V2A.Hp3oGeleAr6HE-F9sMxUhqJPlPQ');

    this.bot();
  }

  private bot(): void {

    this.client.on('ready', async (): Promise<void> => {
      this.logger.log(`Logged in as ${this.client.user.tag}!`);

      //this.channelsLogs.egress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.egress) as TextChannel;
      //this.channelsLogs.regress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.regress) as TextChannel;
    });

    this.client.on('inviteCreate', async (invite: Invite) => {

      const embed = new MessageEmbed();

      embed.setAuthor('VISITOR\'S PASS');
      embed.setThumbnail('https://i.imgur.com/0uEuKxv.png');
      embed.setColor('#bbdefb')

      const temporary: string = invite.temporary === true ? 'Temporary' : 'Permanent';

      embed.addField('Issued by', `${invite.inviter.username}#${invite.inviter.discriminator}`, true);
      embed.addField('Issued by ID', invite.inviter.id, true);
      embed.addField('Code', invite.code, true);
      embed.addField('Access to', `#${invite.channel.name}`, true);
      embed.addField('Access to ID', invite.inviter.id, true);
      embed.addField('Type', temporary, true);

      if (invite.maxUses > 0) embed.addField('Can be used', `${invite.maxUses} times`, true);
      if (invite.maxAge > 0) embed.addField('Expire in', `${ms(invite.maxAge)}`, true);

      const ingress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.ingress) as TextChannel;
      if (ingress) await ingress.send({ embeds: [embed] });
    });

    this.client.on('interactionCreate', async (interaction: Interaction): Promise<void> => {
      if (!interaction.isCommand()) return;

      const command = this.commandsMessage.get(interaction.commandName);
      if (!command) return;

      try {
        await command.executeInteraction({ interaction, redis: this.redisService });
      } catch (error) {
        this.logger.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    });

    this.client.on('guildMemberAdd', async (guildMember) => {
      const t = await this.redisService.get(guildMember.id);
      if (!t) return;

      if (t !== guildMember.id) {
        await guildMember.send('content');
        await guildMember.kick();
      }
    });

    this.client.on('guildMemberRemove', async (guildMember) => {
      const egress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.egress) as TextChannel;

      const embed = new MessageEmbed();
      embed.setAuthor('USER LEFT');

      embed.addField('ID', guildMember.id, true);
      embed.addField('Name', `${guildMember.user.username}#${guildMember.user.discriminator}`, true);

      if (guildMember.joinedTimestamp) {
        const now = new Date().getTime();
        const session = now - guildMember.joinedTimestamp;
        embed.addField('Session', `${ms(session)}`, true);
      }

      await egress.send({ embeds: [ embed ] });
    });
  }

  private loadCommands(): void {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/gatekeeper/src/commands/'))
      .filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const command: IDiscordSlashCommand = require(`./commands/${file}`);
      this.commandsMessage.set(command.name, command);
      this.commandSlash.push(command.slashCommand.toJSON());
    }
  }
}

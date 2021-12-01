import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NlpManager } from 'node-nlp';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import RussianNouns from 'russian-nouns-js';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { REST } from '@discordjs/rest';
import ms from 'ms';
import csv from 'async-csv';
import { Routes } from 'discord-api-types/v9';
import { Account, Character, Entity, Guild, Key, Realm } from '@app/mongo';
import {
  Client,
  Collection,
  Guild as DiscordGuild,
  Intents,
  Interaction,
  Invite,
  MessageEmbed,
  TextChannel, VoiceChannel,
} from 'discord.js';
import {
  capitalize,
  delay,
  DISCORD_CORE,
  DISCORD_CORE_ID,
  DISCORD_UNIT7_ID,
  ENTITY_NAME,
  IAccount,
  IDiscordSlashCommand,
  IEntities,
  IEntity,
  parseAccountDelimiters,
  parseEntityDelimiters,
} from '@app/core';


@Injectable()
export class OraculumService implements OnApplicationBootstrap {

  private readonly logger = new Logger(
    OraculumService.name, { timestamp: true },
  );

  private readonly rne = new RussianNouns.Engine();

  private manager = new NlpManager({
    languages: ['ru', 'en'],
    threshold: 0.8,
    nlp: { log: true },
    forceNER: true,
  });

  private client: Client;

  private key: Key;

  private readonly rest = new REST({ version: '9' });

  private commandSlash = [];

  private discordCore = DISCORD_CORE;

  private commandsMessage: Collection<string, IDiscordSlashCommand> = new Collection();

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Entity.name)
    private readonly EntityModel: Model<Entity>,
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.buildNerEngine(true, true, true);

      this.key = await this.KeysModel.findOne({ tags: { $all: [ 'discord', 'unit7' ] } });
      if (!this.key) throw new ServiceUnavailableException('Available key not found!');

      await this.loadCommands(this.key);

      this.client = new Client({
        partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE'],
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

      await this.client.login(this.key.token);

      this.bot();
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  };

  private async buildNerEngine(
    init: boolean = true,
    initAccounts: boolean = true,
    initEntities: boolean = true,
  ): Promise<void> {
    try {
      this.logger.log(`buildNerEngine: init ${init ? 'true' : 'false'}`);
      if (init) {
        this.logger.log(`initAccounts: ${initAccounts ? 'true' : 'false'}`);
        if (initAccounts) {
          await this.buildAccountsFromCsvFile();
        }

        this.logger.log(`initEntities: ${initEntities ? 'true' : 'false'}`);
        if (initEntities) {
          await this.buildEntitiesFromCsvFile();
          await this.buildEntitiesFromAccounts();
        }

        await this.trainCorpusModel();
      }
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private async buildAccountsFromCsvFile(): Promise<void> {
    try {
      this.logger.debug('buildAccountsFromCsvFile');
      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const files = fs.readdirSync(dirPath)
        .filter(fileName => fileName.startsWith('AccountList'));

      if (files.length === 0) throw new NotFoundException('CSV Entities files not found!');

      for (const file of files) {
        const csvString = await fs.readFile(path.join(dirPath, file), 'utf-8');

        const accounts: IAccount[] = await csv.parse(csvString, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          cast: parseAccountDelimiters
        });

        this.logger.debug(`File found: ${accounts.length} account(s)`);

        for (const account of accounts) {
          const accountExists = await this.AccountModel.findOne({ $or: [
              { discord_id: account.discord_id },
              { battle_tag: account.battle_tag },
            ]
          });

          if (!accountExists) {
            const [nickname] = account.tags;

            await this.AccountModel.create({
              nickname: capitalize(nickname),
              clearance: account.clearance,
              discord_id: account.discord_id,
              battle_tag: account.battle_tag,
              tags: account.tags,
              is_index: account.is_index
            });
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error(`buildAccountsFromCsvFile: ${errorOrException}`);
    }
  }

  private async buildEntitiesFromJsonFile(fileName: string): Promise<void> {
    try {
      this.logger.debug('buildEntitiesFromJsonFile');

      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const filePath = path.join(__dirname, '..', '..', '..', 'files', fileName);
      const fileExist = fs.existsSync(filePath);

      if (!fileExist) {
        throw new ServiceUnavailableException(`${fileName} not found!`);
      }

      const entitiesJson = fs.readFileSync(filePath, 'utf8');

      const { entities } = JSON.parse(entitiesJson) as IEntities;

      for (const entity of entities) {
        const entityExists = await this.EntityModel.findOne({ name: entity.name });
        if (!entityExists) {
          await this.EntityModel.create(entity);
          this.logger.log(`Created: ${entity.entity} | ${entity.name}`);
        }
      }
    } catch (errorOrException) {
      this.logger.error(`buildEntitiesFromJsonFile: ${errorOrException}`);
    }
  }

  private async buildEntitiesFromCsvFile(): Promise<void> {
    try {
      this.logger.debug('buildEntitiesFromCsvFile');

      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const files = fs.readdirSync(dirPath)
        .filter(fileName => fileName.startsWith('EntityList'));

      if (files.length === 0) throw new NotFoundException('CSV Entities files not found!');

      for (const filePath of files) {
        const csvString = await fs.readFile(path.join(dirPath, filePath), 'utf-8');

        const entities: IEntity[] = await csv.parse(csvString, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          cast: parseEntityDelimiters
        });

        for (const entity of entities) {
          const entityExists = await this.EntityModel.findOne({ name: entity.name });
          if (!entityExists) {

            const newEntity = new this.EntityModel({
              entity: entity.entity,
              name: entity.name,
              languages: entity.languages,
              tags: entity.tags
            });

            if (entity.entity === ENTITY_NAME.Guild) {
              const guilds = await this.GuildModel.find({ name: entity.name }).sort({ achievement_points: -1 });
              if (guilds.length) {
                const [guild] = guilds;
                newEntity.guild_id = guild._id;
              }
            }

            if (entity.entity === ENTITY_NAME.Realm) {
              const realm = await this.RealmModel
                .findOne(
                  { $text: { $search: entity.name } },
                  { score: { $meta: 'textScore' } },
                )
                .sort({ score: { $meta: 'textScore' } })
                .lean();

              if (realm) {
                newEntity.realm_id = realm._id;
              }
            }

            await newEntity.save();
            this.logger.log(`Created: ${newEntity.entity} | ${newEntity.name}`);
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error(`buildEntitiesFromCsvFile: ${errorOrException}`);
    }
  }

  private async buildEntitiesFromAccounts(): Promise<void> {
    try {
      this.logger.debug('buildEntitiesFromAccounts');
      await this.EntityModel.deleteMany({ entity: ENTITY_NAME.Person });

      await this.AccountModel
        .find({ is_index: true })
        .cursor()
        .eachAsync(async (account: Account) => {
          try {
            const buildTags = new Set<string>();
            const [name] = account.tags;

            account.tags.map(tag => {
              const lemma = RussianNouns.createLemma({
                text: tag,
                gender: RussianNouns.Gender.NEUTER
              });

              RussianNouns.CASES.map(c =>
                this.rne.decline(lemma, c).map(w => {
                  buildTags.add(w.toLowerCase());
                })
              );
            });

            const [b] = account.battle_tag.split('#');
            buildTags.add(b.toLowerCase());

            const tags = Array.from(buildTags);
            const nameCapitalize = capitalize(name);

            await this.EntityModel.findOneAndUpdate(
              { name: nameCapitalize },
              {
                entity: ENTITY_NAME.Person,
                languages: ['ru', 'en'],
                name: nameCapitalize,
                tags,
                account_id: account._id,
              }, {
                upsert: true
              }
            );
          } catch (errorException) {
            this.logger.error(`${account._id}: ${errorException}`)
          }
        });
    } catch (errorOrException) {
      this.logger.error(`buildEntitiesFromAccounts: ${errorOrException}`)
    }
  }

  private async trainCorpusModel(): Promise<void> {
    try {
      await this.EntityModel
        .find()
        .lean()
        .cursor()
        .eachAsync(entity => {
          this.logger.debug(`NODE-NLP: ${entity.entity} | ${entity.name} added`);
          this.manager.addNamedEntityText(entity.entity, entity.name, entity.languages, entity.tags);
        });

      this.logger.debug(`NODE-NLP: Train process started`);
      // await this.manager.train();
      const corpus = await this.manager.export(false) as string;
      this.logger.debug(`NODE-NLP: Train process ended`);

      this.logger.debug(`NODE-NLP: Ensure corpus model`);
      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const filePath = path.join(__dirname, '..', '..', '..', 'files', 'corpus.json');
      const fileExist = fs.existsSync(filePath);

      if (!fileExist) {
        this.logger.log(`Creating new corpus: ${filePath}`);
        fs.writeFileSync(filePath, corpus);
      }

      if (fileExist) {
        const data = fs.readFileSync(filePath, 'utf8');
        const existCorpus = crypto
          .createHash('md5')
          .update(data, 'utf8')
          .digest('hex');

        const newCorpus = crypto
          .createHash('md5')
          .update(corpus, 'utf8')
          .digest('hex');

        if (existCorpus !== newCorpus) {
          this.logger.log(`Overwriting corpus hash ${existCorpus} with new: ${newCorpus}`);
          fs.writeFileSync(filePath, corpus, { encoding: 'utf8', flag: 'w' });
        }
      }
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private bot(): void {

    this.client.on('ready', async (): Promise<void> => {
      try {
        this.logger.log(`Logged in as ${this.client.user.tag}!`);

        await this.buildDiscordCore();
      } catch (errorException) {
        this.logger.error(`ready: ${errorException}`);
      }
    });

    this.client.on('inviteCreate', async (invite: Invite) => {
      try {
        if (invite.inviter.id !== this.client.user.id) {
          await invite.delete('recreate invite');

          const inviteOptions = {
            maxUses: invite.maxUses || 5,
            maxAge: invite.maxAge || ms('1d'),
            temporary: invite.temporary || false,
            targetUser: invite.targetUser.id
          }

          const channelInvite = await this.client.channels.fetch(invite.channel.id) as TextChannel | VoiceChannel | null;

          if (!channelInvite) throw new NotFoundException(`Channel ${invite.channel.id} not found!`);

          const inviteRecreate = await channelInvite.createInvite(inviteOptions);

          if (this.discordCore.logs.ingress) await this.discordCore.logs.ingress.send({ content: `\`invite re-create ${invite.code} => ${inviteRecreate.code}\`` });

          const embed = new MessageEmbed();

          embed.setAuthor('VISITOR\'S PASS');
          embed.setThumbnail('https://i.imgur.com/0uEuKxv.png');
          embed.setColor('#bbdefb')

          const temporary: string = inviteRecreate.temporary === true ? 'Temporary' : 'Permanent';

          embed.addField('Issued by', `${invite.inviter.username}#${invite.inviter.discriminator}`, true);
          embed.addField('Issued by ID', invite.inviter.id, true);
          embed.addField('Code', inviteRecreate.code, true);
          embed.addField('Access to', `#${inviteRecreate.channel.name}`, true);
          embed.addField('Access to ID', inviteRecreate.targetUser.id, true);
          embed.addField('Type', temporary, true);

          if (invite.maxUses > 0) embed.addField('Can be used', `${inviteRecreate.maxUses} times`, true);
          if (invite.maxAge > 0) embed.addField('Expire in', `${ms(inviteRecreate.maxAge)}`, true);

          if (this.discordCore.logs.ingress) await this.discordCore.logs.ingress.send({ embeds: [embed] });
        }
      } catch (errorException) {
        this.logger.log(`inviteCreate: ${errorException}`);
      }
    });

    this.client.on('interactionCreate', async (interaction: Interaction): Promise<void> => {
      if (!interaction.isCommand()) return;

      const command = this.commandsMessage.get(interaction.commandName);
      if (!command) return;

      try {
        await command.executeInteraction({ interaction, redis: this.redisService, discordCore: this.discordCore });
      } catch (errorException) {
        this.logger.error(errorException);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    });

    this.client.on('guildMemberAdd', async (guildMember) => {
      try {
        const ingressUser = await this.redisService.get(`ingress:${guildMember.id}`);
        // If user doesn't belong to selected invitation
        if (!ingressUser) {
          // if user has first access violation
          const access = await this.redisService.get(`access:${guildMember.id}`);

          if (!!access) {
            await this.redisService.set(`access:${guildMember.id}`, 1, 'EX', ms('1w'));

            const embed = new MessageEmbed()
              .setAuthor('ACCESS VIOLATION')
              .setThumbnail('https://i.imgur.com/OEY92yP.png')
              .setColor('#e1beff')
              .setDescription('You don\'t have access to this section. Further bypass attempts activity will enforce restrictions on your Discord account on the selected server.')

            await guildMember.send({ embeds: [embed] });
            await guildMember.kick('Access Violation');
          } else {
            await guildMember.ban({ reason: 'Access Violation' });
          }
        } else if (this.discordCore.access.V) {
          await guildMember.roles.add(this.discordCore.access.V);
        }
      } catch (errorOrException) {
        this.logger.error(`guildMemberAdd: ${errorOrException}`);
      }
    });

    this.client.on('guildMemberRemove', async (guildMember) => {
      try {
        const embed = new MessageEmbed();
        embed.setAuthor('USER LEFT');

        embed.addField('ID', guildMember.id, true);
        embed.addField('Name', `${guildMember.user.username}#${guildMember.user.discriminator}`, true);

        if (guildMember.joinedTimestamp) {
          const now = new Date().getTime();
          const session = now - guildMember.joinedTimestamp;
          embed.addField('Session', `${ms(session)}`, true);
        }

        await this.discordCore.logs.egress.send({ embeds: [ embed ] });
      } catch (errorOrException) {
        this.logger.error(`guildMemberRemove: ${errorOrException}`);
      }
    });
  }

  private async buildDiscordCore(): Promise<void> {
    try {
      this.logger.debug('buildDiscordCore');

      const guild: DiscordGuild | undefined = await this.client.guilds.fetch(this.discordCore.id);

      // TODO also check by name & .create server

      if (!guild) throw new NotFoundException('Discord Core Server not found!');

      await this.buildRoles(guild);
      await this.buildChannels(guild);
    } catch (errorOrException) {
      this.logger.error(`buildDiscordCore: ${errorOrException}`);
    }
  }

  private async buildRoles(
    guild: DiscordGuild
  ) {
    try {
      this.logger.debug('buildRoles');

      for (const role of this.discordCore.roles) {
        let discordRole = guild.roles.cache.find(r => r.name === role.name);

        if (!discordRole) {
          discordRole = await guild.roles.create({
            name: role.name,
            position: role.position,
            mentionable: role.mentionable,
            permissions: role.permissions.allow,
          });
        }

        this.discordCore[role.name] = discordRole;
      }
    } catch (errorOrException) {
      this.logger.log(`buildRoles: ${errorOrException}`);
    }
  }

  private async buildChannels(
    guild: DiscordGuild,
  ): Promise<void> {
    try {
      this.logger.debug('buildChannels');

      for (const channel of this.discordCore.channels) {
        let guildChannel = guild.channels.cache.find(c => c.name.toLowerCase() === channel.name);

        if (!guildChannel) {
          this.logger.warn(`Channel ${channel.name} not found. Creating...`);
          // const options: GuildChannelCreateOptions = { type: channel.type };
          guildChannel = await guild.channels.create(channel.name,
            { type: channel.type as unknown as 'GUILD_CATEGORY' }
          );
        }

        if (!guildChannel) {
          throw new NotFoundException(`Channel ${channel.name} not found!`);
        }

        await this.redisService.set(`discord:channel:${guildChannel.name.toLowerCase()}`, guildChannel.id);

        if (guildChannel.name.toLowerCase() === 'atlas') {
          await this.redisService.sadd('discord:mirror', guildChannel.id);
        }

        if (guildChannel.name.toLowerCase() === 'files') {
          await this.redisService.sadd('discord:mirror', guildChannel.id);

          await this.AccountModel
            .find({ is_index: true })
            .cursor()
            .eachAsync(async (AccountFile) => {
              try {

                let fileChannel: TextChannel;

                if (AccountFile.oraculum_id) {
                  fileChannel = await guild.channels.fetch(AccountFile.oraculum_id) as TextChannel;
                }

                if (fileChannel) return;

                if (!fileChannel && !AccountFile.oraculum_id) {
                  fileChannel = await guild.channels.cache.find(file => file.name.toLowerCase() === AccountFile.discord_id) as TextChannel;
                }

                if (!fileChannel) {
                  fileChannel = await guild.channels.create(AccountFile.discord_id, {
                    type: 'GUILD_TEXT',
                    parent: guildChannel.id,
                  }) as TextChannel;

                  /**
                   * Sync with category rights
                   * D can write A can read only
                   */
                  await fileChannel.lockPermissions();
                }

                AccountFile.oraculum_id = fileChannel.id;
                await AccountFile.save();
              } catch (errorOrException) {
                this.logger.log(`${AccountFile.discord_id}: ${errorOrException}`);
              }
            });
        }

        if (guildChannel.name.toLowerCase() === 'oraculum') {
          await this.redisService.sadd('discord:mirror', guildChannel.id);
          /**
           * Create channel for every user in
           * ORACULUM network with correct access
           */
          await this.KeysModel
            .find({ tags: 'oracle' })
            .cursor()
            .eachAsync( async (Oracule) => {
              const hex = BigInt(Oracule._id).toString(16).toLowerCase();

              try {
                let oraculumChannel = await guild.channels.cache.find(ora => ora.name.toLowerCase() === hex) as TextChannel;

                await delay(1.5);

                if (!oraculumChannel) {
                  oraculumChannel = await guild.channels.create(hex, {
                    type: 'GUILD_TEXT',
                    parent: guildChannel.id,
                  }) as TextChannel;
                }

                const user = await guild.members.fetch(Oracule._id);

                await oraculumChannel.lockPermissions();

                await oraculumChannel.permissionOverwrites.edit(
                  user, this.discordCore.clearance.write.permissionsOverwrite
                );

                await this.redisService.set(`discord:channel:${oraculumChannel.name.toLowerCase()}`, oraculumChannel.id);
              } catch (errorOrException) {
                this.logger.log(`${hex}: ${errorOrException}`);
              }
            });

          continue;
        }

        if (channel.channels && channel.channels.length) {
          for (const subChannel of channel.channels) {
            const guildSubChannel = guild.channels.cache.find(c => c.name.toLowerCase() === subChannel.name);

            if (guildChannel.name.toLowerCase() === 'logs') {
              if (guildSubChannel.name.toLowerCase() === 'ingress') {
                this.discordCore.logs.ingress = await this.client.channels.fetch(guildSubChannel.id) as TextChannel;
              } else if (guildSubChannel.name.toLowerCase() === 'egress') {
                this.discordCore.logs.egress = await this.client.channels.fetch(guildSubChannel.id) as TextChannel;
              } else if (guildSubChannel.name.toLowerCase() === 'regress') {
                this.discordCore.logs.regress = await this.client.channels.fetch(guildSubChannel.id) as TextChannel;
              }
            }

            if (!guildSubChannel) {
              this.logger.warn(`Channel ${subChannel.name} not found. Creating...`);

              await guild.channels.create(subChannel.name, {
                type: subChannel.type as unknown as 'GUILD_VOICE' | 'GUILD_TEXT',
                parent: guildChannel.id
              });
            }
          }
        }
      }

    } catch (errorOrException) {
      this.logger.error(`buildChannels: ${errorOrException}`);
    }
  }

  private async loadCommands(key: Key): Promise<void> {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/oraculum/src/commands/'))
      .filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const command: IDiscordSlashCommand = require(`./commands/${file}`);
      this.commandsMessage.set(command.name, command);
      this.commandSlash.push(command.slashCommand.toJSON());
    }

    this.rest.setToken(key.token);

    await this.rest.put(
      Routes.applicationGuildCommands(DISCORD_UNIT7_ID, DISCORD_CORE_ID),
      { body: this.commandSlash },
    );

    this.logger.log('Reloaded application (/) commands.');
  }
}

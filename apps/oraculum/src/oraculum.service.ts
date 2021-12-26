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
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job } from 'bullmq';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { Account, Character, Entity, Guild, Key, Realm } from '@app/mongo';
import {
  Client,
  Collection,
  Guild as DiscordGuild,
  Intents,
  Interaction,
  Invite,
  MessageEmbed,
  PermissionFlags,
  Permissions,
  PermissionString,
  Snowflake,
  TextChannel,
  VoiceChannel,
} from 'discord.js';

import {
  capitalize, delay,
  deliveryQueue,
  ORACULUM_CORE_ID,
  ORACULUM_UNIT7_ID,
  DISCORD_REDIS_KEYS,
  ENTITY_NAME,
  ORACULUM_CLEARANCE,
  IAccount, IEntities,
  IDiscordSlashCommand,
  IEntity, IQDelivery,
  OraculumCore,
  parseAccountDelimiters,
  parseEntityDelimiters,
  formatCodeMarkdown,
} from '@app/core';

@Injectable()
@BullWorker({ queueName: deliveryQueue.name, options: deliveryQueue.workerOptions })
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

  private commandSlash = [];

  private oraculumCore = new OraculumCore({ coreId: ORACULUM_CORE_ID, coreName: 'Cognito Inc' });

  private commandsMessage: Collection<string, IDiscordSlashCommand> = new Collection();

  private readonly rest = new REST({ version: '9' });

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
        if (invite.inviter?.id !== this.client.user.id) {
          this.logger.log('Recreate invite');
          await invite.delete('Recreate invite');

          const inviteOptions = {
            maxUses: invite.maxUses || 5,
            maxAge: invite.maxAge || ms('1d'),
            temporary: invite.temporary || false,
            targetUser: invite.targetUser.id
          };

          const channelInvite = await this.client.channels.fetch(invite.channel.id) as TextChannel | VoiceChannel | null;

          if (!channelInvite) throw new NotFoundException(`Channel ${invite.channel.id} not found!`);

          const inviteRecreate = await channelInvite.createInvite(inviteOptions);

          if (this.oraculumCore.channels.logs?.channels.ingress?.channel) {
            this.oraculumCore.channels.logs?.channels.ingress?.channel.send({ content: `\`invite re-create ${invite.code} => ${inviteRecreate.code}\`` });
          }

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

          if (this.oraculumCore.channels.logs?.channels.ingress?.channel) {
            await this.oraculumCore.channels.logs?.channels.ingress?.channel.send({ embeds: [embed] });
          }
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
        await command.executeInteraction({ interaction, redis: this.redisService, oraculumCore: this.oraculumCore });
      } catch (errorException) {
        this.logger.error(errorException);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    });

    this.client.on('guildMemberAdd', async (guildMember) => {
      try {
        const ingressUser = await this.redisService.get(`${DISCORD_REDIS_KEYS.INGRESS}#${guildMember.id}`);
        // If user doesn't belong to selected invitation
        if (!ingressUser) {
          // and has first violation
          const access = await this.redisService.get(`${DISCORD_REDIS_KEYS.JOIN}#${guildMember.id}`);

          if (!!access) {
            await this.redisService.set(`${DISCORD_REDIS_KEYS.JOIN}#${guildMember.id}`, 1, 'EX', ms('1w'));

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
        } else if ( this.oraculumCore.roles.V.id) {
          const roleIdV = await this.redisService.get(`${DISCORD_REDIS_KEYS.ROLE}:${ORACULUM_CLEARANCE.V}`) as Snowflake;
          const roleV = await guildMember.guild.roles.fetch(roleIdV);

          await guildMember.roles.add(roleV);
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

        const egressId = await this.redisService.get(`${DISCORD_REDIS_KEYS.CHANNEL}:${this.oraculumCore.channels.logs.channels.egress.name}`) as Snowflake;
        const egressChannel = await guildMember.guild.channels.fetch(egressId) as TextChannel;

        if (egressChannel) {
          await egressChannel.send({ embeds: [ embed ] });
        }
      } catch (errorOrException) {
        this.logger.error(`guildMemberRemove: ${errorOrException}`);
      }
    });
  }

  private async buildDiscordCore(): Promise<void> {
    try {
      this.logger.debug('buildDiscordCore');

      const guild: DiscordGuild | undefined = await this.client.guilds.fetch(ORACULUM_CORE_ID);
      if (!guild) throw new NotFoundException('Discord Core Server not found!');

      // TODO also check by name & create e server

      await this.buildPermissions(Permissions.FLAGS);
      await this.buildRoles(guild);
      await this.buildChannels(guild);
    } catch (errorOrException) {
      this.logger.error(`buildDiscordCore: ${errorOrException}`);
    }
  }

  private async buildPermissions(Flags: PermissionFlags) {
    this.logger.debug('buildPermissions');

    const TextReadOnly = new Permissions([
      Flags.VIEW_CHANNEL,
      Flags.READ_MESSAGE_HISTORY,
    ]);

    const WriteOnly = new Permissions([
      Flags.VIEW_CHANNEL,
      Flags.SEND_MESSAGES,
      Flags.EMBED_LINKS,
      Flags.ATTACH_FILES,
      Flags.READ_MESSAGE_HISTORY,
    ]);

    const RoleC = new Permissions([
      Flags.CREATE_INSTANT_INVITE,
      Flags.ADMINISTRATOR,
      Flags.VIEW_CHANNEL,
      Flags.CHANGE_NICKNAME,
      Flags.MANAGE_NICKNAMES,
      Flags.KICK_MEMBERS,
      Flags.BAN_MEMBERS,

      Flags.SEND_MESSAGES,
      Flags.MANAGE_THREADS,
      Flags.USE_PUBLIC_THREADS,
      Flags.USE_PRIVATE_THREADS,

      Flags.EMBED_LINKS,
      Flags.ATTACH_FILES,
      Flags.ADD_REACTIONS,
      Flags.USE_EXTERNAL_EMOJIS,
      Flags.USE_EXTERNAL_STICKERS,

      Flags.READ_MESSAGE_HISTORY,
      Flags.USE_APPLICATION_COMMANDS,

      Flags.CONNECT,
      Flags.SPEAK,
      Flags.STREAM,
      Flags.USE_VAD,
      Flags.MUTE_MEMBERS,
      Flags.DEAFEN_MEMBERS,
      Flags.MOVE_MEMBERS,
      Flags.REQUEST_TO_SPEAK,
      Flags.PRIORITY_SPEAKER,

      Flags.MANAGE_CHANNELS,
      Flags.MANAGE_ROLES,
      Flags.MANAGE_EMOJIS_AND_STICKERS,
      Flags.VIEW_AUDIT_LOG,
      Flags.MANAGE_WEBHOOKS,
      Flags.MANAGE_GUILD,

      Flags.MENTION_EVERYONE,
      Flags.SEND_TTS_MESSAGES,
    ]);

    const RoleA = new Permissions([
      Flags.MANAGE_NICKNAMES,
      Flags.VIEW_CHANNEL,
      Flags.CHANGE_NICKNAME,
      Flags.KICK_MEMBERS,
      Flags.BAN_MEMBERS,

      Flags.SEND_MESSAGES,
      Flags.MANAGE_THREADS,
      Flags.USE_PUBLIC_THREADS,
      Flags.USE_PRIVATE_THREADS,

      Flags.EMBED_LINKS,
      Flags.ATTACH_FILES,
      Flags.ADD_REACTIONS,
      Flags.USE_EXTERNAL_EMOJIS,
      Flags.USE_EXTERNAL_STICKERS,

      Flags.READ_MESSAGE_HISTORY,
      Flags.USE_APPLICATION_COMMANDS,

      Flags.CONNECT,
      Flags.SPEAK,
      Flags.STREAM,
      Flags.USE_VAD,
      Flags.MUTE_MEMBERS,
      Flags.DEAFEN_MEMBERS,
      Flags.MOVE_MEMBERS,
      Flags.REQUEST_TO_SPEAK,
      Flags.PRIORITY_SPEAKER,
    ]);

    const RoleD = new Permissions([
      Flags.VIEW_CHANNEL,
      Flags.CHANGE_NICKNAME,
      Flags.MANAGE_NICKNAMES,
      Flags.KICK_MEMBERS,
      Flags.BAN_MEMBERS,

      Flags.SEND_MESSAGES,
      Flags.MANAGE_THREADS,
      Flags.USE_PUBLIC_THREADS,
      Flags.USE_PRIVATE_THREADS,

      Flags.EMBED_LINKS,
      Flags.ATTACH_FILES,
      Flags.ADD_REACTIONS,
      Flags.USE_EXTERNAL_EMOJIS,
      Flags.USE_EXTERNAL_STICKERS,

      Flags.READ_MESSAGE_HISTORY,
      Flags.USE_APPLICATION_COMMANDS,

      Flags.CONNECT,
      Flags.SPEAK,
      Flags.STREAM,
      Flags.USE_VAD,
      Flags.MUTE_MEMBERS,
      Flags.DEAFEN_MEMBERS,
      Flags.MOVE_MEMBERS,
      Flags.REQUEST_TO_SPEAK,
      Flags.PRIORITY_SPEAKER,

      Flags.MANAGE_CHANNELS,
      Flags.MANAGE_ROLES,
      Flags.MANAGE_EMOJIS_AND_STICKERS,
      Flags.VIEW_AUDIT_LOG,
      Flags.MANAGE_WEBHOOKS,
      Flags.MANAGE_GUILD,

      Flags.MENTION_EVERYONE,
      Flags.SEND_TTS_MESSAGES,
    ]);

    const RoleV = new Permissions([
      Flags.VIEW_CHANNEL,

      Flags.READ_MESSAGE_HISTORY,

      Flags.CONNECT,
      Flags.SPEAK,
      Flags.STREAM,
      Flags.USE_VAD,
    ]);

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.TextReadOnly}`, TextReadOnly.toArray());

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.TextWrite}`, WriteOnly.toArray());

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.C}`, RoleC.toArray());

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.D}`, RoleD.toArray());

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.A}`, RoleA.toArray());

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.V}`, RoleV.toArray());

    const commandClearance = await this.AccountModel
      .find({ clearance: ORACULUM_CLEARANCE.A.toLowerCase() })
      .select('discord_id')
      .lean();

    await this.redisService.sadd(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.Commands}`, Array.from(commandClearance).map((acc) => acc.discord_id));
  }

  private async buildRoles(
    guild: DiscordGuild
  ) {
    try {
      this.logger.debug('buildRoles');

      for (const [roleName, role] of Object.entries(this.oraculumCore.roles)) {
        let discordRole = guild.roles.cache.find(r => r.name === roleName);
        if (!discordRole) {

          const permissions = await this.redisService.smembers(`${DISCORD_REDIS_KEYS.ROLE}:${roleName}`) as PermissionString[];
          if (!permissions) {
            throw new NotFoundException(`Permissions ${DISCORD_REDIS_KEYS.ROLE}:${roleName} not found!`);
          }

          discordRole = await guild.roles.create({
            name: roleName,
            position: role.position,
            mentionable: role.mentionable,
            permissions: new Permissions(permissions),
          });

          await this.redisService.set(`${DISCORD_REDIS_KEYS.ROLE}:${roleName}`, discordRole.id);

          this.oraculumCore.roles[roleName].id = discordRole.id;
          this.oraculumCore.roles[roleName].permissions = new Permissions(permissions);
        }
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

      for (const [channelName, channel] of Object.entries(this.oraculumCore.channels)) {
        let guildChannel = guild.channels.cache.find(c => c.name.toLowerCase() === channelName);

        if (!guildChannel) {
          this.logger.warn(`Channel ${channelName} not found. Creating...`);
          // const options: GuildChannelCreateOptions = { type: channel.type };
          guildChannel = await guild.channels.create(channelName,
            { type: channel.type }
          );
        }

        if (!guildChannel) {
          throw new NotFoundException(`Channel ${channelName} not found!`);
        }

        await this.redisService.set(`${DISCORD_REDIS_KEYS.CHANNEL}:${channelName}`, guildChannel.id);
        this.oraculumCore.channels[channelName].id = guildChannel.id;
        this.oraculumCore.channels[channelName].channel = guildChannel;

        if (channel.mirror) {
          await this.redisService.sadd(`${DISCORD_REDIS_KEYS.MIRROR}`, guildChannel.id);
        }

        if (guildChannel.name.toLowerCase() === this.oraculumCore.channels.files.name) {
          await this.AccountModel
            .find({ is_index: true })
            .cursor()
            .eachAsync(async (AccountFile) => {
              try {

                let fileChannel: TextChannel;

                if (AccountFile.oraculum_id) {
                  fileChannel = await guild.channels.cache.get(AccountFile.oraculum_id) as TextChannel;
                }

                if (fileChannel) return;

                // if channel nd oraculum id not found try to find by name
                if (!fileChannel && !AccountFile.oraculum_id) {
                  fileChannel = guild.channels.cache
                    .find(file => file.name.toLowerCase() === AccountFile.discord_id) as TextChannel;
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
                this.logger.log(`${DISCORD_REDIS_KEYS.CHANNEL}: account ${AccountFile.discord_id} ${errorOrException}`);
              }
            });
        }

        if (guildChannel.name.toLowerCase() === this.oraculumCore.channels.oraculum?.name) {
          /**
           * Create channel for every user in
           * ORACULUM network with correct access
           */
          const permissions = await this.redisService.smembers(`${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.TextWrite}`)  as PermissionString[];
          if (!permissions) {
            this.logger.error(`Permissions ${DISCORD_REDIS_KEYS.CLEARANCE}:${ORACULUM_CLEARANCE.TextWrite} for Oraculum subchannels not found!`);
          }

          await this.KeysModel
            .find({ tags: 'oracle' })
            .cursor()
            .eachAsync( async (Oracule) => {
              const hex = BigInt(Oracule._id).toString(16).toLowerCase();

              try {
                const user = await guild.members.cache.get(Oracule._id);
                if (!user) {
                  throw new NotFoundException("not found or haven't been invited yet");
                }

                let oraculumChannel = await guild.channels.cache.find(ora => ora.name.toLowerCase() === hex) as TextChannel;

                await delay(1.5);

                if (!oraculumChannel) {
                  oraculumChannel = await guild.channels.create(hex, {
                    type: 'GUILD_TEXT',
                    parent: guildChannel.id,
                  }) as TextChannel;
                }

                await oraculumChannel.lockPermissions();

                await oraculumChannel.permissionOverwrites.edit(
                  user, new Permissions(permissions).serialize()
                );

                await this.redisService.set(`${DISCORD_REDIS_KEYS.CHANNEL}:${oraculumChannel.name.toLowerCase()}`, oraculumChannel.id);
              } catch (errorOrException) {
                this.logger.log(`${DISCORD_REDIS_KEYS.CHANNEL}: oracle ${hex} ${errorOrException}`);
              }
            });
        }

        if (channel.channels && Object.keys(channel.channels).length) {
          for (const [subChannelName, subChannel] of Object.entries(channel.channels)) {
            let guildSubChannel = guild.channels.cache.find(c => c.name.toLowerCase() === subChannelName);

            if (guildChannel.name.toLowerCase() === this.oraculumCore.channels.logs?.name) {
              this.oraculumCore.channels.logs.channels[subChannelName].channel = await this.client.channels.fetch(guildSubChannel.id) as TextChannel
              await this.redisService.set(`${DISCORD_REDIS_KEYS.CHANNEL}:${subChannelName}`, guildSubChannel.id);
            }

            if (!guildSubChannel) {
              this.logger.warn(`Channel ${subChannelName} not found. Creating...`);

              guildSubChannel = await guild.channels.create(subChannelName, {
                type: subChannel.type as unknown as 'GUILD_VOICE' | 'GUILD_TEXT',
                parent: guildChannel.id
              });
            }

            if (!guildSubChannel) {
              this.logger.error(`Channel ${subChannelName} was not created`);
            } else {
              await this.redisService.set(`${DISCORD_REDIS_KEYS.CHANNEL}:${guildSubChannel.name.toLowerCase()}`, guildSubChannel.id);

              this.oraculumCore.channels[channelName].channels[subChannelName].id = guildChannel.id;
              this.oraculumCore.channels[channelName].channels[subChannelName].channel = guildChannel;
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
      Routes.applicationGuildCommands(ORACULUM_UNIT7_ID, ORACULUM_CORE_ID),
      { body: this.commandSlash },
    );

    this.logger.log('Reloaded application (/) commands.');
  }

  /**
   * @description Send Markdown text to selected channels
   * @param job - BullMQ job IQDelivery formatted
   * @private
   */
  @BullWorkerProcess(deliveryQueue.workerOptions)
  private async process(job: Job<IQDelivery, void>): Promise<void> {
    try {
      let progress: number = 5;

      const { text, channelsId } = { ...job.data };
      await job.updateProgress(progress);

      const percentage = 90 / channelsId.length;

      await lastValueFrom(
        from(channelsId).pipe(
          mergeMap(async (channelId: Snowflake) => {
            progress += percentage;
            try {
              const isChannelExists: boolean = this.client.channels.cache.has(channelId);
              if (!isChannelExists) {
                throw new NotFoundException(`Channel ID ${channelId} not found`);
              }

              const textChannel = this.client.channels.cache.get(channelId) as TextChannel;

              if (text.length < 2000) {
                await textChannel.send(formatCodeMarkdown(text));
              } else {
                const
                  firstText = text.slice(0, 1999),
                  secondText = text.slice(1999);

                await textChannel.send(formatCodeMarkdown(firstText));
                await textChannel.send(formatCodeMarkdown(secondText));
              }

              await job.updateProgress(progress);
            } catch (error) {
              this.logger.warn(error);
            }
          })
        )
      );

      await job.updateProgress(100);
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${deliveryQueue.name}: ${errorException}`);
    }
  }
}

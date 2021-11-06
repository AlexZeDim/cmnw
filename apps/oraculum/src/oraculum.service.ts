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
import { Client, Collection, Intents, Interaction, Invite, MessageEmbed, TextChannel } from 'discord.js';
import ms from 'ms';
import csv from 'async-csv';
import { Routes } from 'discord-api-types';
import { Account, Character, Entity, Guild } from '@app/mongo';
import {
  IAccounts,
  IEntities,
  ENTITY_NAME,
  IDiscordChannelLogs,
  IDiscordSlashCommand,
  DISCORD_CHANNEL_LOGS,
  DISCORD_CORE, IEntity,
  parseEntityDelimiters
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
    builtinWhitelist: []
  });

  private client: Client

  private readonly rest = new REST({ version: '9' }).setToken('ODk1NzY2ODAxOTY1Nzg1MTM4.YV9V2A.Hp3oGeleAr6HE-F9sMxUhqJPlPQ');

  private commandSlash = [];

  private channelsLogs: Partial<IDiscordChannelLogs>;

  private commandsMessage: Collection<string, IDiscordSlashCommand> = new Collection();

  constructor(
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Entity.name)
    private readonly EntityModel: Model<Entity>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.buildNerEngine(false, false, false);

      this.loadCommands();

      await this.rest.put(
        Routes.applicationGuildCommands('895766801965785138', DISCORD_CORE),
        { body: this.commandSlash },
      );

      this.logger.log('Reloaded application (/) commands.');

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

      await this.client.login('ODk1NzY2ODAxOTY1Nzg1MTM4.YV9V2A.Hp3oGeleAr6HE-F9sMxUhqJPlPQ');

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
          await this.buildAccountsFromFile();
        }

        this.logger.log(`initEntities: ${initEntities ? 'true' : 'false'}`);
        if (initEntities) {
          await this.buildEntitiesFromJsonFile();
          await this.buildEntitiesFromCsvFile();
          await this.buildEntitiesFromAccounts();
        }

        await this.trainCorpusModel();
      }
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private async buildAccountsFromFile(): Promise<void> {
    try {
      this.logger.debug('Ensure mock account data');
      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);

      const files: string[] = await fs.readdir(dir);
      const file = files.find(f => f === 'accounts.json');

      const accountsMock = await fs.readFile(path.join(dir, file), 'utf-8');
      const { accounts } = JSON.parse(accountsMock) as IAccounts;

      this.logger.debug(`File found: ${accounts.length} account(s)`);
      for (const account of accounts) {
        const accountExists = await this.AccountModel.findOne({ $or: [
            { discord_id: account.discord_id },
            { battle_tag: account.battle_tag },
            { cryptonym: account.cryptonym },
          ]
        });
        if (!accountExists) await this.AccountModel.create(account);
      }
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private async buildEntitiesFromJsonFile(): Promise<void> {
    try {
      const dirPath = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dirPath);

      const filePath = path.join(__dirname, '..', '..', '..', 'files', 'entities.json');
      const fileExist = fs.existsSync(filePath);

      if (!fileExist) {
        throw new ServiceUnavailableException('Entities not found');
      }

      const entitiesJson = fs.readFileSync(filePath, 'utf8');

      const { entities } = JSON.parse(entitiesJson) as IEntities;

      for (const entity of entities) {
        const entityExists = await this.EntityModel.findOne({ name: entity.name });
        if (!entityExists) {
          await this.EntityModel.create(entity);
          this.logger.log(`Created: entity(${entity.entity}@${entity.name})`);
        }
      }
    } catch (errorOrException) {
      this.logger.error(errorOrException);
    }
  }

  private async buildEntitiesFromCsvFile(): Promise<void> {
    try {
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
            await this.EntityModel.create(entity);
            this.logger.log(`Created: entity(${entity.entity}@${entity.name})`);
          }
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async buildEntitiesFromAccounts(): Promise<void> {
    try {
      this.logger.debug(`Build entity from accounts`);
      await this.AccountModel
        .find()
        .cursor()
        .eachAsync(async (account: Account) => {
          try {
            const tags = new Set<string>();

            account.tags.map(tag => {
              const lemma = RussianNouns.createLemma({
                text: tag,
                gender: RussianNouns.Gender.NEUTER
              });

              RussianNouns.CASES.map(c =>
                this.rne.decline(lemma, c).map(w => {
                  tags.add(w.toLowerCase());
                  tags.add(w);
                })
              );
            })

            account.discord_id.map(discord => {
              const [d] = discord.split('#');
              tags.add(d.toLowerCase());
              tags.add(d);
            })

            account.battle_tag.map(btag => {
              const [b] = btag.split('#');
              tags.add(b.toLowerCase());
              tags.add(b);
            })

            const texts = Array.from(tags);

            await this.EntityModel.findOneAndUpdate(
              { name: texts[0] },
              {
                parentId: account._id.toString(),
                entity: ENTITY_NAME.Person,
                name: texts[0],
                languages: ['ru', 'en'],
                tags: texts
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
          this.logger.debug(`NODE-NLP: entity ${entity.entity}@${entity.name} added`);
          this.manager.addNamedEntityText(entity.entity, entity.name, entity.languages, entity.tags);
        });

      this.logger.debug(`NODE-NLP: Train process started`);
      await this.manager.train();
      this.logger.debug(`NODE-NLP: Train process ended`);

      const corpus = await this.manager.export(false) as string;

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
      this.logger.log(`Logged in as ${this.client.user.tag}!`);

      this.channelsLogs.ingress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.ingress) as TextChannel;
      this.channelsLogs.egress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.egress) as TextChannel;
      this.channelsLogs.regress = await this.client.channels.fetch(DISCORD_CHANNEL_LOGS.regress) as TextChannel;
    });

    this.client.on('inviteCreate', async (invite: Invite) => {
      /**
       * TODO probably not just log but also recreate invite if invite not ORACULUM
       */

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

      if (this.channelsLogs.ingress) await this.channelsLogs.ingress.send({ embeds: [embed] });
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
      const ingressUser = await this.redisService.get(`ingress:${guildMember.id}`);
      // TODO if invite is compromised null it

      if (ingressUser !== guildMember.id || !ingressUser) {
        const access = await this.redisService.get(`access:${guildMember.id}`);

        if (!access) {
          await this.redisService.set(`access:${guildMember.id}`, 1, 'EX', ms('1w'));

          const embed = new MessageEmbed()
            .setAuthor('ACCESS VIOLATION')
            .setThumbnail('https://i.imgur.com/OEY92yP.png')
            .setColor('#e1beff')
            .setDescription('You don\'t have access to this section. Further bypass attempts activity will enforce restrictions on your Discord account on the selected server.')

          await guildMember.send({ embeds: [embed] })
          await guildMember.kick('Access Violation');
        } else {
          await guildMember.ban({ reason: 'Access Violation' });
        }
      }
    });

    this.client.on('guildMemberRemove', async (guildMember) => {

      const embed = new MessageEmbed();
      embed.setAuthor('USER LEFT');

      embed.addField('ID', guildMember.id, true);
      embed.addField('Name', `${guildMember.user.username}#${guildMember.user.discriminator}`, true);

      if (guildMember.joinedTimestamp) {
        const now = new Date().getTime();
        const session = now - guildMember.joinedTimestamp;
        embed.addField('Session', `${ms(session)}`, true);
      }

      await this.channelsLogs.egress.send({ embeds: [ embed ] });
    });
  }

  private async buildCore(): Promise<void> {
    try {

    } catch (e) {

    }
  }

  private loadCommands(): void {
    const commandFiles = fs
      .readdirSync(path.join(`${__dirname}`, '..', '..', '..', 'apps/oraculum/src/commands/'))
      .filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const command: IDiscordSlashCommand = require(`./commands/${file}`);
      this.commandsMessage.set(command.name, command);
      this.commandSlash.push(command.slashCommand.toJSON());
    }
  }
}

import { Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Character, Entity, Guild } from '@app/mongo';
import { Model } from 'mongoose';
import { NlpManager } from 'node-nlp';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { AccountsMock, capitalize, EntityMocks, EntityName } from '@app/core';
import RussianNouns from 'russian-nouns-js';

@Injectable()
export class OraculumService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    OraculumService.name, true,
  );

  private readonly rne = new RussianNouns.Engine();

  private manager = new NlpManager({
    languages: ['ru'],
    threshold: 0.8,
    builtinWhitelist: []
  });

  constructor(
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
    await this.buildAccountsFromMocks();
    await this.buildEntitiesFromMocks();
    await this.buildEntitiesFromAccounts();
    await this.trainCorpusModel();
  };

  private async buildAccountsFromMocks(): Promise<void> {
    try {
      this.logger.debug(`Ensure mock account data`);
      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);
      const files: string[] = await fs.readdir(dir);
      const file = files.find(f => f === 'accounts.json');
      const accountsMock = await fs.readFile(path.join(dir, file), 'utf-8');
      const { accounts } = JSON.parse(accountsMock) as AccountsMock;

      this.logger.debug(`Mock data found: ${accounts.length} account(s)`);
      for (const account of accounts) {
        const accountExists = await this.AccountModel.findOne({ $or: [
            { discord_id: account.discord_id },
            { battle_tag: account.battle_tag },
            { cryptonym: account.cryptonym },
          ]
        });
        if (!accountExists) await this.AccountModel.create(account);
      }
    } catch (error) {
      throw new ServiceUnavailableException(error);
    }
  }

  private async buildEntitiesFromMocks(): Promise<void> {
    try {
      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);

      const file = path.join(__dirname, '..', '..', '..', 'files', 'entities.json');
      const fileExist = fs.existsSync(file);

      if (!fileExist) {
        this.logger.log(`Entities mocks not found`);
        return;
      }

      const entitiesJson = await fs.readFileSync(file, 'utf8');

      const { entities } = JSON.parse(entitiesJson) as EntityMocks;

      for (const entity of entities) {
        const entityExists = await this.EntityModel.findOne({ name: entity.name });
        if (!entityExists) {
          await this.EntityModel.create(entity);
          this.logger.log(`Created: entity(${entity.entity}@${entity.name})`);
        }
      }
    } catch (error) {
      throw new ServiceUnavailableException(error);
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

            await Promise.all(
              account.tags.map(tag => {

                const lemma = RussianNouns.createLemma({
                  text: tag,
                  gender: RussianNouns.Gender.COMMON
                });

                RussianNouns.CASES.map(c =>
                  this.rne.decline(lemma, c).map(w => {
                    tags.add(w.toLowerCase());
                    tags.add(w.toUpperCase());
                    tags.add(capitalize(w));
                    tags.add(w);
                  })
                );
              })
            );

            await Promise.all(
              account.discord_id.map(discord => {
                const [d] = discord.split('#')
                tags.add(d.toLowerCase());
                tags.add(d.toUpperCase());
                tags.add(capitalize(d));
                tags.add(d);
              })
            );

            await Promise.all(
              account.battle_tag.map(btag => {
                const [b] = btag.split('#')
                tags.add(b.toLowerCase());
                tags.add(b.toUpperCase());
                tags.add(capitalize(b));
                tags.add(b);
              })
            );

            const texts = Array.from(tags);

            await this.EntityModel.findOneAndUpdate({ name: texts[0] }, {
              parentId: account._id.toString(),
              entity: EntityName.Persona,
              name: texts[0],
              languages: ['ru', 'en'],
              tags: texts
            }, {
              upsert: true
            });
          } catch (e) {
            this.logger.error(`buildEntitiesFromAccounts: ${e}`)
          }
        })
    } catch (error) {
      throw new ServiceUnavailableException(error);
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
      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);

      const file = path.join(__dirname, '..', '..', '..', 'files', 'corpus.json');
      const fileExist = fs.existsSync(file);

      if (!fileExist) {
        this.logger.log(`Creating new corpus: ${file}`);
        fs.writeFileSync(file, corpus);
      }

      if (fileExist) {
        const data = fs.readFileSync(file, 'utf8');
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
          fs.writeFileSync(file, corpus, { encoding: 'utf8', flag: 'w' });
        }
      }
    } catch (error) {
      throw new ServiceUnavailableException(error);
    }
  }
}

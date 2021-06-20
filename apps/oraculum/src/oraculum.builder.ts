import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Character, Entity, Guild } from '@app/mongo';
import { Model } from 'mongoose';
import path from 'path';
import fs from 'fs-extra';
import { AccountsMock, capitalize, EntityName } from '@app/core';
import RussianNouns from 'russian-nouns-js';

@Injectable()
export class OraculumBuilder {
  private readonly logger = new Logger(
    OraculumBuilder.name, true,
  );

  private readonly rne = new RussianNouns.Engine();

  constructor(
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Entity.name)
    private readonly EntityModel: Model<Entity>,
  ) {
    this.mockAccounts();
    this.entityFromAccounts();
    // this.getCharactersByHash();
  }

  private async entityFromAccounts(): Promise<void> {
    try {
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

            await this.EntityModel.findOneAndUpdate({ optionName: texts[0] }, {
              parentId: account._id.toString(),
              entityName: EntityName.Persona,
              optionName: texts[0],
              languages: ['ru'],
              texts
            }, {
              upsert: true
            });
          } catch (e) {
            this.logger.error(`entityFromAccounts: ${e}`)
          }
        })
    } catch (e) {
      this.logger.log(`createEntities: ${e}`);
    }
  }

  private async getCharactersByHash(): Promise<void> {
    try {
      const characters = await this.CharacterModel.aggregate([
        {
          $match: { guild_id: 'депортация@gordunni' }
        },
        {
          $group: {
            _id: '$hash_b',
            characters: { $addToSet: '$$ROOT' }
          }
        },
        {
          $limit: 100,
        }
      ])
      console.log(characters);
    } catch (e) {
      this.logger.error(`getHello: ${e}`);
    }
  };

  private async mockAccounts(): Promise<void> {
    try {
      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);
      const files: string[] = await fs.readdir(dir);
      const file = files.find(f => f === 'accounts.json');
      const accountsMock = await fs.readFile(path.join(dir, file), 'utf-8');
      const { accounts } = JSON.parse(accountsMock) as AccountsMock;

      for (const account of accounts) {
        const accountExists = await this.AccountModel.findOne({ $or: [
            { discord_id: account.discord_id },
            { battle_tag: account.battle_tag },
            { cryptonym: account.cryptonym },
          ]
        });
        if (!accountExists) await this.AccountModel.create(account);
      }

    } catch (e) {
      this.logger.error(`mockAccounts: ${e}`)
    }
  }
}

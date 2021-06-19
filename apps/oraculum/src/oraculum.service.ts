import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account, Character, Guild } from '@app/mongo';
import { Model } from 'mongoose';
import path from "path";
import fs from 'fs-extra';
import { AccountsMock } from '@app/core';

@Injectable()
export class OraculumService {
  private readonly logger = new Logger(
    OraculumService.name, true,
  );

  constructor(
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
  ) {
    this.mockAccounts();
    // this.getHello();
  }

  private async getHello(): Promise<void> {
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

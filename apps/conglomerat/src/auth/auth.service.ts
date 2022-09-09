import {
  BadRequestException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from '@app/mongo';
import { FilterQuery, LeanDocument, Model } from 'mongoose';
import { AccountGetDto } from '@app/core/dto/account-get.dto';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
  ) {}

  // FIXME deprecated
  async findAccountByDiscordId(discord_id: string): Promise<Account> {
    let user = await this.AccountModel.findOne({ discord_id });

    if (!user) {
      // TODO cryptonym // nickname
      user = await this.AccountModel.create({
        cryptonym: 'Anonymous',
        discord_id: [discord_id]
      });
    }

    return user;
  }

  async getAccount(input: AccountGetDto): Promise<LeanDocument<Account>> {
    const andArray = [];

    if (input.discord_id) andArray.push({ discord_id: input.discord_id });
    if (input.battle_tag) andArray.push({ battle_tag: input.battle_tag });
    if (input.nickname) andArray.push({ nickname: input.nickname });
    if (input.cryptonym) andArray.push({ cryptonym: input.cryptonym });

    if (!andArray.length) {
      throw new BadRequestException('Search criteria not found! You must specify at least one.');
    }

    const query: FilterQuery<Account> = { $and: andArray };

    const account = await this.AccountModel.findOne(query).lean();
    if (!account) throw new NotFoundException('Account not found!');

    return account;
  }

  async addAccountIndex(input: AccountGetDto): Promise<LeanDocument<Account>> {
    const andArray = [];

    if (input.discord_id) andArray.push({ discord_id: input.discord_id });
    if (input.battle_tag) andArray.push({ battle_tag: input.battle_tag });
    if (input.nickname) andArray.push({ nickname: input.nickname });
    if (input.cryptonym) andArray.push({ cryptonym: input.cryptonym });

    if (!andArray.length) {
      throw new BadRequestException('Search criteria not found! You must specify at least one.');
    }

    const query: FilterQuery<Account> = { $and: andArray };

    const updatedAccount = await this.AccountModel.findByIdAndUpdate(query, { index: true }).lean();
    if (!updatedAccount) throw new NotFoundException('Account not found!');

    return updatedAccount;
  }
}

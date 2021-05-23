import {
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from '@app/mongo';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(Account.name)
    private readonly AccountModel: Model<Account>,
  ) {}

  async findAccountByDiscordId(discord_id: string): Promise<Account> {
    let user = await this.AccountModel.findOne({ discord_id });

    if (!user) {
      user = await this.AccountModel.create({
        cryptonym: 'Anonymous',
        discord_id: [discord_id]
      });
    }

    return user;
  }
}

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

  async findAccountByDiscordId(discordId: string): Promise<Account> {
    let user = await this.AccountModel.findOne({ 'alias.type': 'discord', 'alias._id': discordId });

    if ( !user ) {
      user = await this.AccountModel.create({
        cryptonym: 'Anonymous',
        alias: [{
          _id: discordId,
          type: 'discord'
        }]
      });
    }

    return user;
  }
}

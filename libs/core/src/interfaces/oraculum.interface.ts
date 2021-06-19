import { Account } from '@app/mongo';

export class AccountMock implements Pick<Account, 'characters_id' | 'discord_id' | 'battle_tag' | 'cryptonym'> {
  readonly characters_id: string[];
  readonly discord_id: string[];
  readonly battle_tag: string[];
  readonly tags: string[];
  readonly cryptonym: string;
}

export interface AccountsMock {
  readonly accounts: AccountMock[]
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';

@Injectable()
export class OsintService {
  private readonly logger = new Logger(
    OsintService.name, true,
  );

  constructor(
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
  ) { }

  async getCharacter(_id: string): Promise<LeanDocument<Character>> {
    try {
      return await this.CharacterModel.findById(_id).lean();
    } catch (e) {
      throw new Error('kokoko');
    }

  }

  async getCharactersByHash(hash: string): Promise<string[]> {
    return [hash, hash]
  }

  async getCharacterLogs(_id: string): Promise<string[]> {
    return [_id, _id]
  }

  async getGuild(_id: string): Promise<string> {
    // TODO add new dma to queue
    return _id
  }

  async getGuildTest(hash: string): Promise<string[]> {
    return [hash, hash]
  }

  async getGuildLogs(_id: string): Promise<string[]> {
    return [_id, _id]
  }

  async getRealm(_id: string): Promise<string> {
    // TODO add new dma to queue
    return _id
  }

  async getRealmPopulation(_id: string): Promise<string[]> {
    return [_id, _id]
  }

  async getRealms(_id: string): Promise<string[]> {
    return [_id, _id]
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { CharacterIdDto } from './dto';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { charactersQueue, GLOBAL_OSINT_KEY, OSINT_SOURCE } from '@app/core';
import { Queue } from 'bullmq';
import { delay } from '@app/core/utils/converters';

@Injectable()
export class OsintService {
  private readonly logger = new Logger(
    OsintService.name, true,
  );

  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacter: Queue,
  ) { }

  async getCharacter(input: CharacterIdDto): Promise<LeanDocument<Character>> {
    try {
      const character = await this.CharacterModel.findById(input._id).lean();
      if (!character) {
        const key = await this.KeyModel.findOne({ tags: this.clearance });
        const [name, realm] = input._id.split('@');
        await this.queueCharacter.add(
          input._id,
          {
            _id: input._id,
            name,
            realm,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token,
            createdBy: OSINT_SOURCE.REQUESTCHARACTER,
            updatedBy: OSINT_SOURCE.REQUESTCHARACTER,
            guildRank: false,
            createOnlyUnique: false,
            forceUpdate: true,
          },
          {
            jobId: input._id,
            priority: 1
          }
        );
        await delay(2);
        return await this.CharacterModel.findById(input._id).lean();
      }
      return character;
    } catch (e) {
      throw new Error('kokoko'); //FIXME
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

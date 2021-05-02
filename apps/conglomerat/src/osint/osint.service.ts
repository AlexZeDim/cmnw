import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { CharacterHashDto, CharacterIdDto } from './dto';
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
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacter: Queue,
  ) { }

  async getCharacter(input: CharacterIdDto): Promise<LeanDocument<Character>> {
    try {
      const [ name_slug, realm_slug ] = input._id.split('@');
      const realm = await this.RealmModel
        .findOne(
          { $text: { $search: realm_slug } },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .lean();

      if (!realm) {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      }

      const character = await this.CharacterModel.findById(`${name_slug}@${realm.slug}`).lean();
      if (!character) {
        const key = await this.KeyModel.findOne({ tags: this.clearance });
        await this.queueCharacter.add(
          input._id,
          {
            _id: input._id,
            name: name_slug,
            realm: realm.slug,
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
        await delay(3);
        return await this.CharacterModel.findById(input._id).lean();
      }
      return character;
    } catch (e) {
      // FIXME error handling
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCharactersByHash(input: CharacterHashDto): Promise<LeanDocument<Character[]>> {
    try {
      const [ type, hash ] = input.hash.split('@');
      return await this.CharacterModel.find({ [`hash_${type}`]: hash }).lean();
    } catch (e) {
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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

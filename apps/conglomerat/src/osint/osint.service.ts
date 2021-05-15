import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Log, Realm, Subscription } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import {
  CharacterHashDto,
  CharacterIdDto,
  CharactersLfgDto,
  DiscordSubscriptionDto,
  DiscordUidSubscriptionDto,
  GuildIdDto,
} from './dto';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { charactersQueue, GLOBAL_OSINT_KEY, guildsQueue, LFG, OSINT_SOURCE } from '@app/core';
import { Queue } from 'bullmq';
import { delay } from '@app/core/utils/converters';
import { RealmDto } from './dto/realm.dto';

@Injectable()
export class OsintService {

  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Log.name)
    private readonly LogModel: Model<Log>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Subscription.name)
    private readonly SubscriptionModel: Model<Subscription>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacter: Queue,
    @BullQueueInject(guildsQueue.name)
    private readonly queueGuild: Queue,
  ) { }

  async getCharacter(input: CharacterIdDto): Promise<LeanDocument<Character>> {
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

    const _id: string = `${name_slug}@${realm.slug}`;
    const character = await this.CharacterModel.findById(_id).lean();
    if (!character) {
      const key = await this.KeyModel.findOne({ tags: this.clearance });
      await this.queueCharacter.add(
        _id,
        {
          _id: _id,
          name: name_slug,
          realm: realm.slug,
          region: 'eu',
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token,
          created_by: OSINT_SOURCE.REQUESTCHARACTER,
          updated_by: OSINT_SOURCE.REQUESTCHARACTER,
          guildRank: false,
          createOnlyUnique: false,
          forceUpdate: 60000,
        },
        {
          jobId: _id,
          priority: 1
        }
      );
      await delay(5);
      return this.CharacterModel.findById(_id).lean();
    }
    return character;
  }

  async getCharactersByHash(input: CharacterHashDto): Promise<LeanDocument<Character[]>> {
    try {
      const [ type, hash ] = input.hash.split('@');
      // TODO combine default hash search
      return await this.CharacterModel
        .find({ [`hash_${type}`]: hash })
        .limit(100)
        .lean();
    } catch (e) {
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCharactersLfg(input: CharactersLfgDto): Promise<LeanDocument<Character[]>> {
    try {
      const query = { looking_for_guild: LFG.NEW };
      if (input.faction) Object.assign(query, { faction: input.faction });
      if (input.average_item_level) Object.assign(query, { average_item_level: { '$gte': input.average_item_level } });
      if (input.rio_score) Object.assign(query, { rio_score: { '$gte': input.rio_score } });
      if (input.days_from) Object.assign(query, { days_from: { '$gte': input.days_from } });
      if (input.days_to) Object.assign(query, { days_to: { '$lte': input.days_to } });
      if (input.wcl_percentile) Object.assign(query, { wcl_percentile: { '$gte': input.wcl_percentile } });
      if (input.languages) Object.assign(query, { languages : { '$in': input.languages } });
      if (input.realms) Object.assign(query, { realms : { '$in': input.realms } });
      return await this.CharacterModel.find(query).lean();
    } catch (e) {
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCharacterLogs(input: CharacterIdDto): Promise<LeanDocument<Log[]>> {
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

    return this.LogModel.find({ root_id: `${name_slug}@${realm.slug}` }).limit(250).lean();
  }

  async getGuild(input: GuildIdDto): Promise<LeanDocument<Guild>> {
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

    const _id: string = `${name_slug}@${realm.slug}`;
    const guild = await this.GuildModel.findById(_id);
    console.log(_id);
    const [g] = await this.GuildModel.aggregate([
      {
        $match: {
          _id: `${name_slug}@${realm.slug}`
        }
      },
      {
        $project: {
          _id: 1,
          members: { $slice: ['$members', 3] }
        }
      },
      {
        $lookup: {
          from: "characters",
          let: {
            members: "$members"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    "$_id",
                    "$$members._id"
                  ]
                }
              }
            },
            {
              $addFields: {
                guild_rank: {
                  $reduce: {
                    input: "$$members",
                    initialValue: null,
                    in: {
                      $cond: [
                        {
                          $eq: [
                            "$$this._id",
                            "$_id"
                          ]
                        },
                        "$$this.rank",
                        "$$value"
                      ]
                    }
                  }
                }
              }
            }
          ],
          as: "members"
        },
      }
      /*{
        $lookup: {
          from: 'characters',
          localField: 'members._id',
          foreignField: '_id',
          as: 'members',
        },
      },*/
      /*{
        $project: {
          members: 1,
          guild_members: 1
        }
      }*/
    ]).allowDiskUse(true);
    console.log(g);

    if (!guild) {
      const key = await this.KeyModel.findOne({ tags: this.clearance });
      await this.queueGuild.add(
        _id,
        {
          _id: _id,
          name: name_slug,
          realm: realm.slug,
          members: [],
          forceUpdate: 60000,
          createOnlyUnique: true,
          region: 'eu',
          created_by: OSINT_SOURCE.REQUESTGUILD,
          updated_by: OSINT_SOURCE.REQUESTGUILD,
          clientId: key._id,
          clientSecret: key.secret,
          accessToken: key.token
        }, {
          jobId: _id,
          priority: 1
        }
      );
      await delay(5);
      return this.GuildModel.findById(_id).lean();
    }
    return guild;
  }

  async getGuildLogs(input: GuildIdDto): Promise<LeanDocument<Log[]>> {
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

    return this.LogModel.find({ root_id: `${name_slug}@${realm.slug}` }).limit(250).lean();
  }

  async getRealmPopulation(_id: string): Promise<string[]> {
    return [_id, _id]
  }

  async getRealms(input: RealmDto): Promise<LeanDocument<Realm>[]> {
    return this.RealmModel.find(input);
  }

  async checkDiscord(input: DiscordUidSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.SubscriptionModel.findOne({ discord_id: input.discord_id, channel_id: input.channel_id }).lean();
  }

  async subscribeDiscord(input: DiscordSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.SubscriptionModel.findOneAndUpdate({
      discord_id: input.discord_id,
      channel_id: input.channel_id
    }, input as unknown, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  }

  async unsubscribeDiscord(input: DiscordUidSubscriptionDto): Promise<void> {
    await this.SubscriptionModel.findOneAndDelete(input);
  }
}

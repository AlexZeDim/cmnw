import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Log, Realm, Subscription } from '@app/mongo';
import { FilterQuery, LeanDocument, Model } from 'mongoose';
import {
  CharacterHashDto,
  CharacterIdDto,
  CharactersLfgDto,
  charactersQueue,
  DiscordSubscriptionDto,
  DiscordUidSubscriptionDto,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  guildsQueue,
  LFG,
  NOTIFICATIONS,
  OSINT_SOURCE,
  RealmDto,
  toSlug,
} from '@app/core';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';

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

  async uploadOsintLua(file: Buffer): Promise<void> {
    const keys = await this.KeyModel.find({ tags: this.clearance });
    let i: number = 0;
    let iteration: number = 0;

    const characterLuaStrings = file.toString('utf8')
      .split('["csv"] = ')[1]
      .match(/[^\r\n]+/g);

    characterLuaStrings.map(characterLua => {
      const [character] = characterLua.split(/(,\s--\s\[\d)/);
      if (character.startsWith('\t\t"') && character.endsWith('"')) {
        const [name, realm] = character
          .replace(/"/g, '')
          .replace('\t\t', '')
          .split(',');

        const _id = toSlug(`${name}@${realm}`);

        this.queueCharacter.add(
          _id,
          {
            _id: _id,
            name: name,
            realm: realm,
            region: 'eu',
            clientId: keys[i]._id,
            clientSecret: keys[i].secret,
            accessToken: keys[i].token,
            created_by: OSINT_SOURCE.OSINT_LUA,
            updated_by: OSINT_SOURCE.OSINT_LUA,
            guildRank: false,
            createOnlyUnique: false,
            forceUpdate: 60000,
          },
          {
            jobId: _id,
            priority: 1
          }
        );

        i++;
        iteration++;
        if (i >= keys.length) i = 0;
      }
    });
  }

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
      throw new BadRequestException( `Realm: ${realm_slug} for selected character: ${input._id} not found!`);
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
      throw new NotFoundException(`Character: ${_id} not found, but will be added to OSINT-DB on existence shortly`);
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
    } catch (errorException) {
      throw new ServiceUnavailableException(`Query: ${input.hash} got error on request!`);
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
    } catch (errorException) {
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

    return this.LogModel.find({ root_id: `${name_slug}@${realm.slug}`, event: 'character' }).limit(250).lean();
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
      throw new BadRequestException( `Realm: ${realm_slug} for selected character: ${input._id} not found!`);
    }

    const _id: string = toSlug(`${name_slug}@${realm.slug}`);

    const matchStage = { $match: { _id: _id } };
    const lookupStage = {
      $lookup: {
        from: "characters",
        localField: "members._id",
        foreignField: "_id",
        as: "guild_members"
      }
    };
    const projectStage = {
      $project: {
        "guild_members.pets": 0,
        "guild_members.professions": 0,
        "guild_members.mounts": 0,
        "guild_members.languages": 0,
        "guild_members.raid_progress": 0,
      }
    };
    const addFieldStage = {
      $addFields: {
        "members": {
          $map: {
            input: "$members",
            as: "member",
            in: {
              $mergeObjects: [
                "$$member",
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$guild_members",
                        cond: { $eq: ["$$this._id", "$$member._id"] }
                      }
                    },
                    0
                  ]
                }
              ]
            }
          }
        }
      }
    };

    // TODO add interface
    const [guild] = await this.GuildModel.aggregate([
      matchStage,
      lookupStage,
      projectStage,
      addFieldStage,
    ]).allowDiskUse(true);

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
      throw new NotFoundException(`Guild: ${_id} not found, but will be added to OSINT-DB on existence shortly`);
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

    return this.LogModel.find({ root_id: `${name_slug}@${realm.slug}`, event: 'guild' }).limit(250).lean();
  }

  async getRealmPopulation(_id: string): Promise<string[]> {
    return [_id, _id]
  }

  async getRealms(input: RealmDto): Promise<LeanDocument<Realm>[]> {
    return this.RealmModel.find(input);
  }

  async checkDiscord(input: DiscordUidSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.SubscriptionModel.findById(`${input.discord_id}${input.channel_id}`).lean();
  }

  async subscribeDiscord(input: DiscordSubscriptionDto): Promise<LeanDocument<Subscription>> {

    const query: FilterQuery<Realm> = input.type === NOTIFICATIONS.CANDIDATES
      ? { locale: input.realms }
      : { connected_realm_id: input.connected_realm_id };

    const realmsFilter = await this.RealmModel.find(query);

    const subscription = new this.SubscriptionModel(input);

    if (realmsFilter.length > 0) {
      realmsFilter.map((realm) => {
        subscription.realms_connected.addToSet({
          _id: realm._id,
          name: realm.name,
          slug: realm.slug,
          connected_realm_id: realm.connected_realm_id,
          name_locale: realm.name_locale,
          locale: realm.locale,
          region: realm.region,
          auctions: realm.auctions,
          golds: realm.golds,
        });
      })
    }

    return this.SubscriptionModel.findOneAndReplace(
      { _id: `${input.discord_id}${input.channel_id}` },
      subscription,
      { new: true }
      ).lean();
  }

  async unsubscribeDiscord(input: DiscordUidSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.SubscriptionModel.findByIdAndDelete(`${input.discord_id}${input.channel_id}`).lean();
  }
}

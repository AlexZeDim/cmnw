import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersProfileEntity,
  GuildsEntity,
  KeysEntity,
  LogsEntity,
  RealmsEntity,
} from '@app/pg';

import { FindOptionsWhere, In, MoreThanOrEqual, Repository } from 'typeorm';

import {
  CHARACTER_HASH_FIELDS,
  CharacterHashDto,
  CharacterHashFieldType,
  CharacterIdDto,
  CharacterJobQueue,
  CharactersLfgDto,
  charactersQueue,
  EVENT_LOG,
  findRealm,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  GuildJobQueue,
  guildsQueue,
  LFG_STATUS,
  OSINT_SOURCE,
  RealmDto,
  toGuid,
} from '@app/core';

@Injectable()
export class OsintService {
  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly charactersGuildMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(LogsEntity)
    private readonly logsRepository: Repository<LogsEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacter: Queue<CharacterJobQueue, number>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuild: Queue<GuildJobQueue, number>,
  ) {}

  async getGuild(input: GuildIdDto) {
    const [nameSlug, realmSlug] = input.guid.split('@');

    const realmEntity = await findRealm(this.realmsRepository, realmSlug);

    if (!realmEntity) {
      throw new BadRequestException(
        `Realm: ${realmSlug} for character ${input.guid} not found!`,
      );
    }

    const guid = toGuid(nameSlug, realmEntity.slug);

    const [guild, guildMembers] = await Promise.all([
      this.guildsRepository.findOneBy({ guid }),
      this.charactersGuildMembersRepository.find({
        where: { guildGuid: guid },
        take: 250,
      }),
    ]);

    await this.queueGuild.add(guid, {
      createOnlyUnique: false,
      forceUpdate: 60 * 60 * 24,
      region: 'eu',
      requestGuildRank: true,
      guid: guid,
      name: nameSlug,
      realm: realmEntity.slug,
      createdBy: OSINT_SOURCE.GUILD_REQUEST,
      updatedBy: OSINT_SOURCE.GUILD_REQUEST,
    });

    if (!guild) {
      throw new NotFoundException(
        `Guild: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
      );
    }
    // TODO to export DTO
    return { ...guild, ...guildMembers };
  }

  async getCharacter(input: CharacterIdDto) {
    const [nameSlug, realmSlug] = input.guid.split('@');

    const realmEntity = await findRealm(this.realmsRepository, realmSlug);

    if (!realmEntity) {
      throw new BadRequestException(
        `Realm: ${realmSlug} for character ${input.guid} not found!`,
      );
    }

    const guid = toGuid(nameSlug, realmEntity.slug);
    // TODO join models
    const character = await this.charactersRepository.findOneBy({
      guid,
    });

    const [keyEntity] = await getKeys(this.keysRepository, this.clearance, true);

    await this.queueCharacter.add(
      guid,
      {
        guid: guid,
        name: nameSlug,
        realm: realmEntity.slug,
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
        createdBy: OSINT_SOURCE.CHARACTER_REQUEST,
        updatedBy: OSINT_SOURCE.CHARACTER_REQUEST,
        requestGuildRank: false,
        createOnlyUnique: false,
        forceUpdate: 1000 * 60 * 60,
      },
      {
        jobId: guid,
        priority: 1,
      },
    );

    if (!character) {
      throw new NotFoundException(
        `Character: ${guid} not found, but will be added to OSINT-DB on existence shortly`,
      );
    }

    return character;
  }

  async getCharactersByHash(input: CharacterHashDto) {
    try {
      const [type, hash] = input.hash.split('@');
      const isHashField = CHARACTER_HASH_FIELDS.has(<CharacterHashFieldType>type);
      if (!isHashField) {
        throw new ServiceUnavailableException(`Query: hash ${type} not exists`);
      }

      const hashType = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>type);
      const whereQuery: FindOptionsWhere<CharactersEntity> = {
        [hashType]: hash,
      };
      // TODO join?
      return await this.charactersRepository.find({
        where: whereQuery,
        take: 100,
      });
    } catch (errorOrException) {
      throw new ServiceUnavailableException(
        `Query: ${input.hash} got error on request!`,
      );
    }
  }

  async getCharactersLfg(input: CharactersLfgDto) {
    try {
      const where: FindOptionsWhere<CharactersProfileEntity> = {
        lfgStatus: LFG_STATUS.NEW,
      };

      if (input.raiderIoScore)
        where.raiderIoScore = MoreThanOrEqual(input.raiderIoScore);
      if (input.mythicLogs) where.mythicLogs = MoreThanOrEqual(input.mythicLogs);
      if (input.heroicLogs) where.heroicLogs = MoreThanOrEqual(input.heroicLogs);
      if (input.realmsId) {
        where.realmId = In(input.realmsId);
      }

      return await this.charactersProfileRepository.findBy(where);
    } catch (errorOrException) {
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCharacterLogs(input: CharacterIdDto) {
    return await this.logsRepository.find({
      where: {
        guid: input.guid,
        event: EVENT_LOG.CHARACTER,
      },
      take: 250,
    });
  }

  async getGuildLogs(input: GuildIdDto) {
    return await this.logsRepository.find({
      where: {
        guid: input.guid,
        event: EVENT_LOG.CHARACTER,
      },
      take: 250,
    });
  }
  // TODO logic for realm population
  async getRealmPopulation(_id: string): Promise<string[]> {
    return [_id, _id];
  }

  async getRealms(input: RealmDto) {
    return this.realmsRepository.findBy(input);
  }
}

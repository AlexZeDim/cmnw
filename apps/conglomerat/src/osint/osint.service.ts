import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersProfileEntity,
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
  CharactersLfgDto,
  charactersQueue,
  DiscordSubscriptionDto,
  DiscordUidSubscriptionDto,
  EVENT_LOG,
  findRealm,
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildIdDto,
  guildsQueue,
  LFG_STATUS,
  NOTIFICATIONS,
  OSINT_SOURCE,
  RealmDto,
  toSlug,
} from '@app/core';

@Injectable()
export class OsintService {
  private clearance: string = GLOBAL_OSINT_KEY;

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(LogsEntity)
    private readonly logsRepository: Repository<LogsEntity>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacter: Queue,
    @BullQueueInject(guildsQueue.name)
    private readonly queueGuild: Queue,
  ) {}

  async getCharacter(input: CharacterIdDto) {
    const [nameSlug, realmSlug] = input.guid.split('@');

    const realmEntity = await findRealm(this.realmsRepository, realmSlug);

    if (!realmEntity) {
      throw new BadRequestException(
        `Realm: ${realmSlug} for selected character: ${input.guid} not found!`,
      );
    }

    const characterGuid = `${nameSlug}@${realmEntity.slug}`;
    const character = await this.charactersRepository.findOneBy({
      guid: characterGuid,
    });
    // TODO update
    const [keyEntity] = await getKeys(this.keysRepository, this.clearance);

    await this.queueCharacter.add(
      characterGuid,
      {
        _id: characterGuid,
        name: nameSlug,
        realm: realmEntity.slug,
        region: 'eu',
        clientId: keyEntity.client,
        clientSecret: keyEntity.secret,
        accessToken: keyEntity.token,
        created_by: OSINT_SOURCE.CHARACTER_REQUEST,
        updated_by: OSINT_SOURCE.CHARACTER_REQUEST,
        guildRank: false,
        createOnlyUnique: false,
        forceUpdate: 1000 * 60 * 60,
      },
      {
        jobId: characterGuid,
        priority: 1,
      },
    );
    if (!character) {
      throw new NotFoundException(
        `Character: ${characterGuid} not found, but will be added to OSINT-DB on existence shortly`,
      );
    }
    return character;
  }

  async getCharactersByHash(input: CharacterHashDto) {
    try {
      const [type, hash] = input.hash.split('@');
      const isHashFieldExists = CHARACTER_HASH_FIELDS.has(
        <CharacterHashFieldType>type,
      );
      if (!isHashFieldExists) {
        throw new ServiceUnavailableException(`Query: hash ${type} not exists`);
      }

      const hashField = CHARACTER_HASH_FIELDS.get(<CharacterHashFieldType>type);
      const whereQuery: FindOptionsWhere<CharactersEntity> = {
        [hashField]: hash,
      };

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
      return await this.charactersRepository.findBy(where);
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

  async getRealmPopulation(_id: string): Promise<string[]> {
    return [_id, _id];
  }

  async getRealms(input: RealmDto) {
    return this.realmsRepository.findBy(input);
  }
}

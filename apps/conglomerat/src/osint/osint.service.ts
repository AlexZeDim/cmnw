import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OsintService {
  private readonly logger = new Logger(
    OsintService.name, true,
  );

  constructor(

  ) { }

  getCharacter(_id: string): string {
    // TODO add new dma to queue
    return _id
  }

  getCharactersByHash(hash: string): string[] {
    return [hash, hash]
  }

  getCharacterLogs(_id: string): string[] {
    return [_id, _id]
  }

  getGuild(_id: string): string {
    // TODO add new dma to queue
    return _id
  }

  getGuildTest(hash: string): string[] {
    return [hash, hash]
  }

  getGuildLogs(_id: string): string[] {
    return [_id, _id]
  }

  getRealm(_id: string): string {
    // TODO add new dma to queue
    return _id
  }

  getRealmPopulation(_id: string): string[] {
    return [_id, _id]
  }

  getRealms(_id: string): string[] {
    return [_id, _id]
  }
}

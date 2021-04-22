import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Req } from '@nestjs/common';
import { OsintService } from './osint.service';

@Controller('osint')
export class OsintController {
  private readonly logger = new Logger(
    OsintController.name, true,
  );

  constructor(
    private readonly osintService: OsintService
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get('/character/:_id')
  getCharacter(@Param('_id') _id: string): string {
    // TODO validate
    return this.osintService.getCharacter(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/character/hash/:hash')
  getCharactersByHash(@Param('hash') hash: string): string[] {
    // TODO validate
    return this.osintService.getCharactersByHash(hash);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/character/logs/:_id')
  getCharacterLogs(@Param('_id') _id: string): string[] {
    // TODO validate
    return this.osintService.getCharacterLogs(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/:_id')
  getRealm(@Param('_id') _id: string): string {
    // TODO validate
    return this.osintService.getRealm(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/population/:_id')
  getRealmPopulation(@Param('_id') _id: string): string[] {
    // TODO validate
    return this.osintService.getRealmPopulation(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realms/:_id')
  getRealms(@Param('_id') _id: string): string[] {
    // TODO validate
    return this.osintService.getRealms(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/:_id')
  getGuild(@Param('_id') _id: string): string {
    // TODO validate
    return this.osintService.getGuild(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/test/:hash')
  getGuildTest(@Param('hash') hash: string): string[] {
    // TODO validate
    return this.osintService.getGuildTest(hash);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/logs/:_id')
  getGuildLogs(@Param('_id') _id: string): string[] {
    // TODO validate
    return this.osintService.getGuildLogs(_id);
  }
}

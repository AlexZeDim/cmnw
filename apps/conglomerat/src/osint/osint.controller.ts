import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { OsintService } from './osint.service';
import { LeanDocument } from "mongoose";
import { Character } from '@app/mongo';
import {
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CharacterIdDto } from './dto';

@Controller('osint')
export class OsintController {
  private readonly logger = new Logger(
    OsintController.name, true,
  );

  constructor(
    private readonly osintService: OsintService
  ) {}

  @ApiOperation({ description: 'Returns requested character' })
  @ApiOkResponse({ description: 'Request character with selected _id' })
  @ApiUnauthorizedResponse({ description: 'Token can be wrong, blacklisted, expired or not provided' })
  @ApiForbiddenResponse({ description: 'You cannot access this waypoint' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Gate Orders is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/character')
  async getCharacter(@Query() input: CharacterIdDto): Promise<LeanDocument<Character>> {
    return this.osintService.getCharacter(input);
  }

  @ApiOperation({ description: 'Returns requested character' })
  @ApiOkResponse({ description: 'Request character with selected _id' })
  @ApiUnauthorizedResponse({ description: '' })
  @ApiForbiddenResponse({ description: 'You cannot access this waypoint' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Gate Orders is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/character/hash/:hash')
  async getCharactersByHash(@Param('hash') hash: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getCharactersByHash(hash);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/character/logs/:_id')
  async getCharacterLogs(@Param('_id') _id: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getCharacterLogs(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/:_id')
  async getRealm(@Param('_id') _id: string): Promise<string> {
    // TODO validate
    return this.osintService.getRealm(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/population/:_id')
  async getRealmPopulation(@Param('_id') _id: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getRealmPopulation(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realms/:_id')
  async getRealms(@Param('_id') _id: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getRealms(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/:_id')
  async getGuild(@Param('_id') _id: string): Promise<string> {
    // TODO validate
    return this.osintService.getGuild(_id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/test/:hash')
  async getGuildTest(@Param('hash') hash: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getGuildTest(hash);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/guild/logs/:_id')
  async getGuildLogs(@Param('_id') _id: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getGuildLogs(_id);
  }
}

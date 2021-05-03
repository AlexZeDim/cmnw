import { Controller, Get, HttpCode, HttpStatus, Logger, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { OsintService } from './osint.service';
import { LeanDocument } from "mongoose";
import { Character, Guild, Log, Realm } from '@app/mongo';
import {
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CharacterHashDto, CharacterIdDto, GuildIdDto } from './dto';
import { RealmDto } from './dto/realm.dto';

@ApiTags('osint')
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
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/character')
  async getCharacter(@Query() input: CharacterIdDto): Promise<LeanDocument<Character>> {
    return this.osintService.getCharacter(input);
  }

  @ApiOperation({ description: 'Returns requested account characters' })
  @ApiOkResponse({ description: 'Request characters with selected hash' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/character/hash')
  async getCharactersByHash(@Query() input: CharacterHashDto): Promise<LeanDocument<Character[]>> {
    return this.osintService.getCharactersByHash(input);
  }

  @ApiOperation({ description: 'Returns requested character logs' })
  @ApiOkResponse({ description: 'Request logs for selected character' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/character/logs')
  async getCharacterLogs(@Query() input: CharacterIdDto): Promise<LeanDocument<Log[]>> {
    return this.osintService.getCharacterLogs(input);
  }

  @ApiOperation({ description: 'Returns requested guild' })
  @ApiOkResponse({ description: 'Request guild with requested _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/guild')
  async getGuild(@Query() input: GuildIdDto): Promise<LeanDocument<Guild>> {
    return this.osintService.getGuild(input);
  }

  @ApiOperation({ description: 'Returns requested guild logs' })
  @ApiOkResponse({ description: 'Request guild logs for guild with selected _id' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/guild/logs')
  async getGuildLogs(@Query() input: GuildIdDto): Promise<LeanDocument<Log[]>> {
    return this.osintService.getGuildLogs(input);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/realm/population/:_id')
  async getRealmPopulation(@Param('_id') _id: string): Promise<string[]> {
    // TODO validate
    return this.osintService.getRealmPopulation(_id);
  }

  @ApiOperation({ description: 'Returns requested realm' })
  @ApiOkResponse({ description: 'Request realm logs by various different criteria' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/realms')
  async getRealms(@Query() input: RealmDto): Promise<LeanDocument<Realm>[]> {
    return this.osintService.getRealms(input);
  }
}

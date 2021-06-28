import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post, Put,
  Query, UploadedFile, UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Express } from 'express'
import { OsintService } from './osint.service';
import { LeanDocument } from "mongoose";
import { Character, Guild, Log, Realm, Subscription } from '@app/mongo';
import {
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTags, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import {
  CharacterHashDto,
  CharacterIdDto,
  CharactersLfgDto,
  DiscordSubscriptionDto,
  DiscordUidSubscriptionDto,
  GuildIdDto,
} from './dto';
import { RealmDto } from './dto/realm.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import path from 'path';

@ApiTags('osint')
@Controller('osint')
export class OsintController {

  constructor(
    private readonly osintService: OsintService
  ) {}


  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1000 * 1000 },
    fileFilter: function (req, file, cb){
      const filetypes = /lua/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) return cb(null, true);
      cb(new Error(`Error: File upload only supports the following filetypes - ${filetypes}`), false);
    }
  }))
  async uploadOsintLua(@UploadedFile() file: Express.Multer.File) {
    await this.osintService.uploadOsintLua(file.buffer)
  }

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

  @ApiOperation({ description: 'Returns characters which are looking for guild' })
  @ApiOkResponse({ description: 'Request characters with selected input parameters' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/character/lfg')
  async getCharactersLfg(@Query() input: CharactersLfgDto): Promise<LeanDocument<Character[]>> {
    return this.osintService.getCharactersLfg(input);
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
    // TODO wip
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

  @ApiOperation({ description: 'Check current subscription' })
  @ApiOkResponse({ description: 'Returns discord server with current subscription' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Get('/discord')
  async checkDiscord(@Query() input: DiscordUidSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.osintService.checkDiscord(input);
  }

  @ApiOperation({ description: 'Create or update subscription' })
  @ApiOkResponse({ description: 'Returns a created or existing subscription for current channel & server' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Post('/discord/subscribe')
  async subscribeDiscord(@Body() input: DiscordSubscriptionDto): Promise<LeanDocument<Subscription>> {
    return this.osintService.subscribeDiscord(input)
  }

  @ApiOperation({ description: 'Unsubscribes discord server and channel from notifications' })
  @ApiOkResponse({ description: 'Returns empty result on success with status code OK' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiServiceUnavailableResponse({ description: 'Commonwealth API is not available at the moment' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @Put('/discord/unsubscribe')
  async unsubscribeDiscord(@Body() input: DiscordUidSubscriptionDto): Promise<void> {
    return this.osintService.unsubscribeDiscord(input)
  }
}

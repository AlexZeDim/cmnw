import { Controller, Get, HttpCode, HttpStatus, Logger, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AccountGetDto } from '@app/core/dto/account-get.dto';
import { LeanDocument } from 'mongoose';
import { Account } from '@app/mongo';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(
    AuthController.name, { timestamp: true },
  );

  constructor(
    private readonly authService: AuthService
  ) { }

  @Get('/discord')
  @UseGuards(AuthGuard('discord'))
  async getUserFromDiscordLogin(@Req() req): Promise<any> {
    // TODO auth
    return req.user;
  }

  @Get('/battlenet')
  @UseGuards(AuthGuard('battlenet'))
  async getUserFromBattleNetLogin(@Req() req): Promise<any> {
    // TODO auth
    return req.user;
  }

  @ApiOperation({ description: 'Request account from conglomerat database' })
  @ApiOkResponse({ description: 'Returns user account if exists' })
  @ApiNotFoundResponse({ description: 'User account not found!' })
  @ApiUnauthorizedResponse({ description: 'You need authenticate yourself before request' })
  @ApiForbiddenResponse({ description: 'You don`t have clearance for that' })
  @ApiBadRequestResponse({ description: 'The server could not understand the request due to invalid syntax' })
  @ApiServiceUnavailableResponse({ description: 'Server is under maintenance or overloaded' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @HttpCode(HttpStatus.OK)
  @Get('/account')
  async getAccount(@Query() input: AccountGetDto): Promise<LeanDocument<Account>> {
    return await this.authService.getAccount(input);
  }
}

import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(
    AuthController.name, true,
  );
  constructor(
    private readonly authService: AuthService
  ) {

  }

  @Get('/discord')
  @UseGuards(AuthGuard('discord'))
  async getUserFromDiscordLogin(@Req() req): Promise<any> {
    return req.user;
  }
}

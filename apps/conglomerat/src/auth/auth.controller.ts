import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(
    AuthController.name, true,
  );
  constructor(
    private readonly authService: AuthService
  ) {}

  @Get('/test')
  async auth(@Query() input: string): Promise<string> {
    return await this.authService.test(input)
  }
}

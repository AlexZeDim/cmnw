import { Controller, Get } from '@nestjs/common';
import { OsintService } from './osint.service';

@Controller()
export class OsintController {
  constructor(private readonly osintService: OsintService) {}

  @Get()
  getHello(): string {
    return this.osintService.getHello();
  }
}

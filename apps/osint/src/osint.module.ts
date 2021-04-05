import { Module } from '@nestjs/common';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';

@Module({
  imports: [],
  controllers: [OsintController],
  providers: [OsintService],
})
export class OsintModule {}

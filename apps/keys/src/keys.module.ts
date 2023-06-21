import { Module } from '@nestjs/common';
import { postgresConfig } from '@app/configuration';
import { KeysService } from './keys.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity]),
  ],
  controllers: [],
  providers: [KeysService],
})
export class KeysModule {}

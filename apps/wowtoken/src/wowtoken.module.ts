import { Module } from '@nestjs/common';
import { WowtokenService } from './wowtoken.service';
import { postgresConfig } from '@app/configuration';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, MarketEntity]),
  ],
  controllers: [],
  providers: [WowtokenService],
})
export class WowtokenModule {}

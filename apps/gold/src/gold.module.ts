import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoldService } from './gold.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, MarketEntity]),
  ],
  controllers: [],
  providers: [GoldService],
})
export class GoldModule {}

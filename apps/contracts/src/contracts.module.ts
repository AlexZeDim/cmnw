import { Module } from '@nestjs/common';
import { postgresConfig } from '@app/configuration';
import { ContractsService } from './contracts.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractEntity, ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      RealmsEntity,
      MarketEntity,
      ContractEntity,
      ItemsEntity
    ]),
  ],
  controllers: [],
  providers: [ContractsService],
})
export class ContractsModule {}

import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { ContractEntity, ItemsEntity, MarketEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      ItemsEntity,
      RealmsEntity,
      MarketEntity,
      ContractEntity,
    ]),
  ],
  controllers: [],
  providers: [ContractsService],
})
export class ContractsModule {}

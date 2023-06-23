import { Module } from '@nestjs/common';
import { TestsOsint } from './tests.osint';
import { TestsDma } from './tests.dma';
import { TestsBench } from './tests.bench';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, MarketEntity, ItemsEntity]),
  ],
  controllers: [],
  providers: [TestsOsint, TestsDma, TestsBench],
})
export class TestsModule {}

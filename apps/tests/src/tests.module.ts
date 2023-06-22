import { Module } from '@nestjs/common';
import { TestsOsint } from './tests.osint';
import { TestsDma } from './tests.dma';
import { TestsEntity } from './tests.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, MarketEntity]),
  ],
  controllers: [],
  providers: [TestsOsint, TestsDma, TestsEntity],
})
export class TestsModule {}

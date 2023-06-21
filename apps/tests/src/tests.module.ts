import { Module } from '@nestjs/common';
import { TestsOsint } from './tests.osint';
import { TestDma } from './test.dma';

@Module({
  imports: [],
  controllers: [],
  providers: [TestsOsint, TestDma],
})
export class TestsModule {}

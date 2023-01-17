import { Module } from '@nestjs/common';
import { TestsOsint } from './tests.osint';

@Module({
  imports: [],
  controllers: [],
  providers: [TestsOsint],
})
export class TestsModule {}

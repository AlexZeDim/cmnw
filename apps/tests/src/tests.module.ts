import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';

@Module({
  imports: [],
  controllers: [],
  providers: [TestsService],
})
export class TestsModule {}

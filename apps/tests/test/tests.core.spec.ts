import { Test, TestingModule } from '@nestjs/testing';
import { TestsCore } from '../src/tests.core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from '@app/configuration';
import { KeysEntity } from '@app/pg';

describe('CORE', () => {
  let testsService: TestsCore;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(postgresConfig),
        TypeOrmModule.forFeature([KeysEntity]),
      ],
      controllers: [],
      providers: [TestsCore],
    }).compile();

    testsService = app.get<TestsCore>(TestsCore);
  });

  describe('RANDOM PROXY', () => {
    it('get random proxy', async () => {
      const proxy1 = await testsService.getRandomProxy();
      const proxy2 = await testsService.getRandomProxy();
      const proxy3 = await testsService.getRandomProxy();
      console.log(proxy1, proxy2, proxy3);
    });
  });

  describe('RANDOM PROXY REQUEST', () => {
    it('get guild request with random proxy', async () => {
      const result = await testsService.requestWithRandomProxy('рак-гейминг', 'soulflayer');
      console.log(result);
    });
  });
});

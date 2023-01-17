import { Test, TestingModule } from '@nestjs/testing';
import { TestsService } from './tests.service';

describe('TestsController', () => {
  let testsService: TestsService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestsService],
    }).compile();

    testsService = app.get<TestsService>(TestsService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(testsService.getHello()).toBe('Hello World!');
    });
  });
});

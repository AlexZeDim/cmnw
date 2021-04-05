import { Test, TestingModule } from '@nestjs/testing';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';

describe('OsintController', () => {
  let osintController: OsintController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OsintController],
      providers: [OsintService],
    }).compile();

    osintController = app.get<OsintController>(OsintController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(osintController.getHello()).toBe('Hello World!');
    });
  });
});

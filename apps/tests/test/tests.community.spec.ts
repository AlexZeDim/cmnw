import { Test } from '@nestjs/testing';
import { TestsCommunity } from '../src/tests.community';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';

describe('COMMUNITY', () => {
  let testsService: TestsCommunity;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const [app] = await Promise.all([
      Test.createTestingModule({
        imports: [HttpModule],
        controllers: [],
        providers: [TestsCommunity],
      }).compile(),
    ]);

    testsService = app.get<TestsCommunity>(TestsCommunity);
  });

  describe('WCL-PAGE-LOGS', () => {
    it('page response', async () => {
      const response = await testsService.getLogsFromPage(
        warcraftLogsConfig,
        417,
        1,
      );

      expect(Array.isArray(response)).toBeTruthy();
    });
  });
});

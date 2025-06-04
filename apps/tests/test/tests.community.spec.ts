import { Test } from '@nestjs/testing';
import { TestsCommunity } from '../src/tests.community';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpModule } from '@nestjs/axios';
import { raidCharacter } from '../mocks';

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
      response.map((logId) => expect(logId).toEqual(expect.any(String)));
    });
  });

  describe('WCL-CHARACTER-RAID-LOGS', () => {
    it('logs response', async () => {
      const raidCharacters = await testsService.getCharactersFromLogs(
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NDdmMWQyZi0wZWE3LTQzNGQtODg1Ni0zN2I2Nzg2ZTJjZjkiLCJqdGkiOiJjYTBlNTc4NGU5ZTA3NjI4NWVhY2NmZjkyNWY2NTFmOGFlMzZlYTg4ZTIyZDJhOWQ1Mjk4ZWQ2Nzk2MjZlYTBjODk4NmM1MWQxZTRlY2FlNCIsImlhdCI6MTcwNzczNzg1OS4yNTQwMTEsIm5iZiI6MTcwNzczNzg1OS4yNTQwMTMsImV4cCI6MTczODg0MTg1OS4yNDY2OTEsInN1YiI6IiIsInNjb3BlcyI6WyJ2aWV3LXVzZXItcHJvZmlsZSIsInZpZXctcHJpdmF0ZS1yZXBvcnRzIl19.HHehvbK64mrpMhXT6vVno-GR_ILsDuZ5xmGnp_qF5NBPX0mQNqlMrFw-INm7bVH9UwsYlfJypfjIK5ikcRyuwoGiWABVFYE501aLbxiDI25aQimdi6Ltu-MOhInxfmzNZ2-2dNuOlEx790WdaJCkiMprgHj-ix7eGs_uytUi-5gDx1OP-gBlmT-LIMBOTBnWHqe_0V-0pEVO2-qzfxfNAC-sGIPxoJ5C0pcM7gFQ9FWSSmyFk3kqYrJtadnGtBonOOxNR4RDpHcafHnOVTPQccOhTN08XzHNk0ze8-x9YnXiXJnI4xN8uuhrIBerSwtD2W_DXuB_9_EkxhpIyqvruFQVj2e-BcuKiJzn_5027zDsPSmSm1HJc937lXb4tk_OOpHmt82SDRKwgN-E-OHjkMaAmfhfdKXZJ954KNLWfu-Rx5esstfyYqbl4c61eHt9L-ZB4qg7XfZREIXGfyB3dCRXHMEwxZmXEzTyIe1R0mmRnz7voNKLgiIRjsPMB6F7rZjDZr3fG-txrRlo8nanGx6_omXkAkrL_oYXiUffmMq1TdT6FXf9OuHu7s1TkwcutNHXXVAzjKZHyFxghWoOyiODDSR2Ey5yHt3PqaDJbetazYHaKPn1W4JBNd2jZWXN98nuVP09o7IOciOUNtgicYPcQuW9qRvVBfPwhShnuBg',
        '7M98VAxrmyKvZhqd',
      );

      expect(Array.isArray(raidCharacters)).toBeTruthy();
      raidCharacters.map((character) =>
        expect(character).toMatchObject(raidCharacter),
      );
    });
  });
});

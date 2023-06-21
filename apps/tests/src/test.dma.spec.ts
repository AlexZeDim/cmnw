import { Test, TestingModule } from '@nestjs/testing';
import { TestDma } from './test.dma';
import { commodityItem, TCommodityItem } from '@app/e2e/characters';

describe('DMA', () => {
  let testsService: TestDma;
  jest.setTimeout(600_000);

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestDma],
    }).compile();

    testsService = app.get<TestDma>(TestDma);
  });

  describe('commodities', () => {
    it('return COMMDTY response', async () => {
      const response = await testsService.commodity();
      expect(response).toHaveProperty('auctions');
      expect(response.auctions.length).not.toBeLessThan(0);

      const [ item ] = response.auctions;

      expect(item).toMatchObject<TCommodityItem>(commodityItem);
    });
  });
});



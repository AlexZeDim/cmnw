import { Test, TestingModule } from '@nestjs/testing';
import { TestDma } from './test.dma';
import { DateTime } from 'luxon';
import { commodityItem } from '@app/core';

describe('DMA', () => {
  let testsService: TestDma;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestDma],
    }).compile();

    testsService = app.get<TestDma>(TestDma);
  });

  describe('COMMDTY', () => {
    it('commodities response', async () => {
      const response = await testsService.commodity();
      expect(response).toHaveProperty('lastModified');
      expect(response).toHaveProperty('auctions');
      expect(Array.isArray(response.auctions)).toBeTruthy();

      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toBe(Date);

      const [item] = response.auctions;
      console.log(item.item);
      expect(item).toMatchObject(commodityItem);
    });
  });

  describe('AUCTIONS', () => {
    it('auctions response', async () => {
      const response = await testsService.auctions(1615);
      expect(response).toHaveProperty('lastModified');
      expect(response).toHaveProperty('auctions');
      expect(Array.isArray(response.auctions)).toBeTruthy();

      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));

      response.auctions.map((auction) =>
        expect(auction.item.id).toEqual(expect.any(Number)),
      );
    });
  });
});

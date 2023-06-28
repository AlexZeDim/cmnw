import { Test, TestingModule } from '@nestjs/testing';
import { DateTime } from 'luxon';
import { TestsDma } from '../src/tests.dma';
import { commodityItem, item, wowTokenItem } from '../mocks';

describe('DMA', () => {
  let testsService: TestsDma;
  jest.setTimeout(600_000);

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestsDma],
    }).compile();

    testsService = app.get<TestsDma>(TestsDma);
  });

  describe('COMMDTY', () => {
    it('commodities response', async () => {
      const response = await testsService.commodity();
      expect(response).toHaveProperty('lastModified');
      expect(response).toHaveProperty('auctions');
      expect(Array.isArray(response.auctions)).toBeTruthy();

      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));

      const [item] = response.auctions;
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

  describe('WOWTOKEN', () => {
    it('wowtoken response', async () => {
      const response = await testsService.wowToken();
      expect(response).toMatchObject(wowTokenItem);
      expect(response).toHaveProperty('lastModified');
      const lastModified = DateTime.fromRFC2822(response.lastModified).toJSDate();
      expect(lastModified).toEqual(expect.any(Date));
    });
  });

  describe('ITEM', () => {
    it('item response', async () => {
      const response = await testsService.item(191341);
      expect(response).toMatchObject(item);
    });
  });

  describe('ITEM MEDIA', () => {
    it('item media response', async () => {
      const response = await testsService.itemMedia(191341);
      console.log(response);
    });
  });
});

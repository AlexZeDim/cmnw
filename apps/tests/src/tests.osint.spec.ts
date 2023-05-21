import { Test, TestingModule } from '@nestjs/testing';
import { TestsOsint } from './tests.osint';
import {
  characterSummary,
  TCharacterSummary,
  mountsSummary,
  petsSummary,
  objectPet,
  objectMount
} from '@app/e2e/characters';
import * as console from "console";

describe('OSINT', () => {
  let testsService: TestsOsint;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestsOsint],
    }).compile();

    testsService = app.get<TestsOsint>(TestsOsint);
  });

  describe('summary', () => {
    it('return character summary response', async () => {
      const response = await testsService.summary('лисаорк', 'howling-fjord');
      console.log(response);
      expect(response).toMatchObject<TCharacterSummary>(characterSummary);
      /**
       * @description We could always use more .haveProperty things
       * @description for test implementing of characters endpoints
       */
      // expect(response).toHaveProperty('id', 4);
      // expect(response).not.toHaveProperty('guild');
    });
  });

  describe('mounts', () => {
    it('return Character Mounts Collection Summary', async () => {
      const response = await testsService.mounts('лисаорк', 'howling-fjord');
      console.log(response);
      const [ mount ] = response.mounts;
      response.mounts.map(mount => expect(response).toMatchObject(objectMount));
    });
  });

  describe('pets', () => {
    it('return Character Pets Collection Summary', async () => {
      const response = await testsService.pets('лисаорк', 'howling-fjord');
      expect(response).toHaveProperty('pets');
      expect(response.pets.length).not.toBeLessThan(0);
      const [ pet ] = response.pets;
      response.pets.map(pet => expect(pet).toMatchObject(objectPet));
    });
  });

});

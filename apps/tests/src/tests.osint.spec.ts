import { Test, TestingModule } from '@nestjs/testing';
import { TestsOsint } from './tests.osint';
import {
  characterSummary,
  TCharacterSummary,
  objectPet,
  objectMount,
  statusObj,
  guildMembersRosterObj,
  guildObj,
  professionObj,
  guildRosterObj,
} from '@app/e2e/characters';

describe('OSINT', () => {
  let testsService: TestsOsint;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [TestsOsint],
    }).compile();

    testsService = app.get<TestsOsint>(TestsOsint);
  });

  describe('summary', () => {
    it('return character summary response', async () => {
      const response = await testsService.summary('лисаорк', 'howling-fjord');
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
    it('return character mount collection', async () => {
      const response = await testsService.mounts('лисаорк', 'howling-fjord');
      expect(response).toHaveProperty('mounts');
      expect(Array.isArray(response.mounts)).toBeTruthy();
      response.mounts.map((mount) => expect(mount).toMatchObject(objectMount));
    });
  });

  describe('pets', () => {
    it('return character pets collection', async () => {
      const response = await testsService.pets('лисаорк', 'howling-fjord');
      expect(response).toHaveProperty('pets');
      expect(Array.isArray(response.pets)).toBeTruthy();
      response.pets.map((pet) => expect(pet).toMatchObject(objectPet));
    });
  });

  describe('status', () => {
    it('return character profile status', async () => {
      const response = await testsService.status('лисаорк', 'howling-fjord');
      expect(response).toMatchObject(statusObj);
    });
  });

  describe('professions', () => {
    it('return character professions summary', async () => {
      const response = await testsService.professions('лисаорк', 'howling-fjord');
      expect(response).toMatchObject(professionObj);
    });
  });

  describe('guild', () => {
    it('return guild', async () => {
      const response = await testsService.guild('рак-гейминг', 'soulflayer');
      expect(response).toMatchObject(guildObj);
    });
  });

  describe('guildRoster', () => {
    it('return guild roster', async () => {
      const response = await testsService.guildRoster('рак-гейминг', 'soulflayer');
      expect(response).toHaveProperty('members');
      expect(Array.isArray(response.members)).toBeTruthy();
      expect(response).toMatchObject(guildRosterObj);
      expect(['Allicane', 'Horde']).toContain(response.guild.faction.name);
      response.members.map((member) =>
        expect(member).toMatchObject(guildMembersRosterObj),
      );
    });
  });
});

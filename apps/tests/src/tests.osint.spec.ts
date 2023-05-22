import { Test, TestingModule } from '@nestjs/testing';
import { TestsOsint } from './tests.osint';
import {
  characterSummary,
  TCharacterSummary,
  mountsSummary,
  petsSummary,
  objectPet,
  objectMount, statusObj, members_guildRosterObj, guildRosterObj, guildObj, professionObj,
} from '@app/e2e/characters';


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

  describe('status', () => {
    it('haracter Profile Status', async () => {
      const response = await testsService.status('лисаорк', 'howling-fjord');
      expect(response).toMatchObject(statusObj);
    });
  });

  describe('guild', () => {
    it('return Guild', async () => {
      const response = await testsService.guild('рак-гейминг', 'soulflayer');
      expect(response).toMatchObject(guildObj);
    });
  });

  describe('guild_roster', () => {
    it('return Guild Roster', async () => {
      const response = await testsService.guild_roster('рак-гейминг', 'soulflayer');
      const [ member ] = response.members;

      expect(response).toMatchObject(guildRosterObj);
      expect(['Allicane', 'Horde']).toContain(response.guild.faction.name);
      response.members.map(member => expect(member.character).toMatchObject(members_guildRosterObj));
    });
  });

  describe('professions', () => {
    it('Character Professions Summary', async () => {
      const response = await testsService.professions('лисаорк', 'howling-fjord');
      expect(response).toMatchObject(professionObj);
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { TestsOsint } from './tests.osint';
import {
  characterSummary,
  objectPet,
  objectMount,
  statusObj,
  guildMembersRosterObj,
  guildObj,
  professionObj,
  guildRosterObj,
  objectRealm,
  objectConnectedRealm,
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

  describe('realm', () => {
    it('return realm response', async () => {
      const response = await testsService.realm('howling-fjord');
      expect(response).toMatchObject(objectRealm);
    });
  });

  describe('connectedRealm', () => {
    it('return connected realm response', async () => {
      const response = await testsService.connectedRealm(1615);
      expect(response).toMatchObject(objectConnectedRealm);
    });
  });

  describe('summary', () => {
    it('return character summary response', async () => {
      const response = await testsService.summary('лисаорк', 'howling-fjord');
      expect(response).toMatchObject(characterSummary);
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

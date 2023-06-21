import { Repository } from 'typeorm';
import { CharactersEntity, GuildsEntity } from '@app/pg';
import { OSINT_SOURCE, toGuid, ICharacterGuildMember } from '@app/core';

export const characterAsGuildMember = async (
  repository: Repository<CharactersEntity>,
  guildEntity: GuildsEntity,
  guildMember: ICharacterGuildMember,
) => {
  let characterEntity = await repository.findOneBy({
    guid: guildMember.guid,
  });

  if (characterEntity) {
    const isUpdateByGuild =
      guildEntity.lastModified &&
      characterEntity.lastModified &&
      guildEntity.lastModified.getTime() > characterEntity.lastModified.getTime();

    if (isUpdateByGuild) {
      characterEntity.realm = guildEntity.realm;
      characterEntity.realmId = guildEntity.realmId;
      characterEntity.realmName = guildEntity.realmName;
      characterEntity.guildGuid = guildEntity.guid;
      characterEntity.guild = guildEntity.name;
      characterEntity.guildId = guildEntity.id;
      characterEntity.guildRank = guildMember.rank;
      characterEntity.faction = guildEntity.faction;
      if (guildMember.level) characterEntity.level = guildMember.level;
      if (guildMember.class) characterEntity.class = guildMember.class;
      characterEntity.lastModified = guildEntity.lastModified;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await repository.save(characterEntity);
    } else if (guildEntity.guid === characterEntity.guildGuid) {
      characterEntity.guildRank = guildMember.rank;
      characterEntity.updatedBy = OSINT_SOURCE.GUILD_ROSTER;
      await repository.save(characterEntity);
    }
  }

  if (!characterEntity) {
    characterEntity = repository.create({
      id: guildMember.id,
      name: guildMember.name,
      realm: guildEntity.realm,
      realmId: guildEntity.realmId,
      realmName: guildEntity.realmName,
      guildGuid: toGuid(guildMember.guildNameSlug, guildEntity.realm),
      guild: guildEntity.name,
      guildRank: guildMember.rank,
      guildId: guildEntity.id,
      class: guildMember.class,
      faction: guildEntity.faction,
      level: guildMember.level,
      lastModified: guildEntity.lastModified,
      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
      createdBy: OSINT_SOURCE.GUILD_ROSTER,
    });

    await repository.save(characterEntity);
  }
};

export const propRefLink = {
  href: expect.any(String),
};

export const keyPropRefLink = {
  key: expect.objectContaining(propRefLink),
};

export const objectPropRef = {
  id: expect.any(Number),
  name: expect.any(String),
  key: expect.objectContaining(propRefLink),
};

export const objectRealmPropRef = {
  id: expect.any(Number),
  name: expect.any(String),
  key: expect.objectContaining(propRefLink),
  slug: expect.any(String),
};

export const objectNamedProperty = {
  type: expect.any(String),
  name: expect.any(String),
};

export const objectRealm = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  region: {
    key: expect.objectContaining(propRefLink),
    id: expect.any(Number),
    name: expect.any(String),
  },
  connected_realm: expect.objectContaining(propRefLink),
  name: expect.any(String),
  category: expect.any(String),
  locale: expect.any(String),
  timezone: expect.any(String),
  type: expect.objectContaining(objectNamedProperty),
  is_tournament: expect.any(Boolean),
  slug: expect.any(String),
  lastModified: expect.any(String),
};

export const objectConnectedRealmArray = {
  id: expect.any(Number),
  region: {
    key: expect.objectContaining(propRefLink),
    id: expect.any(Number),
    name: expect.any(String),
  },
  connected_realm: expect.objectContaining(propRefLink),
  name: expect.any(String),
  category: expect.any(String),
  locale: expect.any(String),
  timezone: expect.any(String),
  type: expect.objectContaining(objectNamedProperty),
  is_tournament: expect.any(Boolean),
  slug: expect.any(String),
};

export const objectConnectedRealm = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  has_queue: expect.any(Boolean),
  status: expect.objectContaining(objectNamedProperty),
  population: expect.objectContaining(objectNamedProperty),
  realms: expect.arrayContaining([objectConnectedRealmArray]),
  mythic_leaderboards: expect.objectContaining(propRefLink),
  auctions: expect.objectContaining(propRefLink),
  lastModified: expect.any(String),
};

export const objectMount = {
  mount: expect.objectContaining(objectPropRef),
  is_useable: expect.any(Boolean),
};

export const mountsSummary = {
  _links: { self: expect.objectContaining(propRefLink) },
  mounts: expect.arrayContaining([objectMount]),
};

export const objectPet = {
  species: expect.objectContaining({
    id: expect.any(Number),
    name: expect.any(String),
  }),
  level: expect.any(Number),
  id: expect.any(Number),
};
export const petsSummary = {
  _links: { self: expect.objectContaining(propRefLink) },
  pets: expect.arrayContaining([expect.objectContaining({ objectPet })]),
};

export const guildMemberObj = {
  key: expect.objectContaining(propRefLink),
  name: expect.any(String),
  id: expect.any(Number),
  level: expect.any(Number),
  realm: expect.objectContaining({
    key: expect.objectContaining(propRefLink),
    id: expect.any(Number),
    slug: expect.any(String),
  }),
  playable_class: expect.objectContaining({
    key: expect.objectContaining(propRefLink),
    id: expect.any(Number),
  }),
  playable_race: expect.objectContaining({
    key: expect.objectContaining(propRefLink),
    id: expect.any(Number),
  }),
};

export const guildMembersRosterObj = {
  character: expect.objectContaining(guildMemberObj),
  rank: expect.any(Number),
};

export const guildRosterObj = {
  _links: { self: expect.objectContaining(propRefLink) },
  guild: expect.objectContaining({
    key: expect.objectContaining(propRefLink),
    name: expect.any(String),
    id: expect.any(Number),
    realm: expect.objectContaining({
      key: expect.objectContaining(propRefLink),
      name: expect.any(String),
      id: expect.any(Number),
      slug: expect.any(String),
    }),
    faction: expect.objectContaining(objectNamedProperty),
  }),
  members: expect.arrayContaining([guildMembersRosterObj]),
  lastModified: expect.any(String),
};

export const guildObj = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  name: expect.any(String),
  achievement_points: expect.any(Number),
  member_count: expect.any(Number),
  realm: expect.objectContaining({
    id: expect.any(Number),
    name: expect.any(String),
    slug: expect.any(String),
  }),
  roster: expect.objectContaining({ href: expect.any(String) }),
  achievements: expect.objectContaining({ href: expect.any(String) }),
  created_timestamp: expect.any(Number),
  lastModified: expect.any(String),
};

export const professionObj = {
  lastModified: expect.any(String),
  primaries: expect.objectContaining([
    expect.objectContaining({
      profession: expect.objectContaining([]),
      tiers: expect.objectContaining([]),
    }),
  ]),
  secondaries: expect.objectContaining([
    expect.objectContaining({
      profession: expect.objectContaining([]),
      tiers: expect.objectContaining([]),
    }),
  ]),
  character: expect.objectContaining({
    name: expect.any(String),
    id: expect.any(Number),
    realm: expect.objectContaining({
      name: expect.any(String),
      id: expect.any(Number),
      slug: expect.any(String),
    }),
  }),
};

export const statusObj = {
  _links: { self: expect.objectContaining(propRefLink) },
  id: expect.any(Number),
  is_valid: expect.any(Boolean),
  lastModified: expect.any(String),
};

export const characterSummary = {
  id: expect.any(Number),
  name: expect.any(String),
  gender: expect.objectContaining(objectNamedProperty),
  race: expect.objectContaining(objectPropRef),
  character_class: expect.objectContaining(objectPropRef),
  active_spec: expect.objectContaining(objectPropRef),
  realm: expect.objectContaining(objectRealmPropRef),
  level: expect.any(Number),
  experience: expect.any(Number),
  achievement_points: expect.any(Number),
  achievements: expect.objectContaining(propRefLink),
  titles: expect.objectContaining(propRefLink),
  pvp_summary: expect.objectContaining(propRefLink),
  encounters: expect.objectContaining(propRefLink),
  media: expect.objectContaining(propRefLink),
  last_login_timestamp: expect.any(Number),
  average_item_level: expect.any(Number),
  equipped_item_level: expect.any(Number),
  specializations: expect.objectContaining(propRefLink),
  statistics: expect.objectContaining(propRefLink),
  mythic_keystone_profile: expect.objectContaining(propRefLink),
  equipment: expect.objectContaining(propRefLink),
  appearance: expect.objectContaining(propRefLink),
  collections: expect.objectContaining(propRefLink),
  reputations: expect.objectContaining(propRefLink),
  quests: expect.objectContaining(propRefLink),
  achievements_statistics: expect.objectContaining(propRefLink),
  professions: expect.objectContaining(propRefLink),
  lastModified: expect.any(String),
};

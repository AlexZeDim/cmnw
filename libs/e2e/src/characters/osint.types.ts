import objectContaining = jasmine.objectContaining;

export const propRefLink: PropRefLink = {
  href: expect.any(String),
};

export const objectPropRef: ObjectPropRef = {
  id: expect.any(Number),
  name: expect.any(String),
  key: expect.objectContaining(propRefLink),
};

export const objectRealmPropRef: ObjectPropRef & { slug: string } = {
  id: expect.any(Number),
  name: expect.any(String),
  key: expect.objectContaining(propRefLink),
  slug: expect.any(String),
};

export const objectProperty: ObjectProp = {
  type: expect.any(String),
  name: expect.any(String),
};

export const objectMount = {
  _links: { self: expect.objectContaining(propRefLink) },
};

export const objectMounts = {
  mount: expect.objectContaining(objectPropRef),
  is_useable: expect.any(Boolean),
};

export const  mountsSummary = {
  _links: { self: expect.objectContaining(propRefLink) },
  mounts: expect.arrayContaining([objectMounts]),
};

export const characterSummary = {
  id: expect.any(Number),
  name: expect.any(String),
  gender: expect.objectContaining(objectProperty),
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

export class TCharacterSummary {
  id: number;

  name: string;

  gender: ObjectProp;

  race: ObjectPropRef;

  character_class: ObjectProp;

  active_spec: ObjectProp;

  realm: ObjectPropRef & { slug: string };

  level: number;

  experience: number;

  achievement_points: number;

  achievements: PropRefLink;

  titles: PropRefLink;

  pvp_summary: PropRefLink;

  encounters: PropRefLink;

  media: PropRefLink;

  last_login_timestamp: number;

  average_item_level: number;

  equipped_item_level: number;

  specializations: PropRefLink;

  statistics: PropRefLink;

  mythic_keystone_profile: PropRefLink;

  equipment: PropRefLink;

  appearance: PropRefLink;

  collections: PropRefLink;

  reputations: PropRefLink;

  quests: PropRefLink;

  achievements_statistics: PropRefLink;

  professions: PropRefLink;

  lastModified: string | Date;

  constructor(data: Record<string, any>) {
    Object.assign(this, data);
  }

  static fromResponse(response: Record<string, any>): TCharacterSummary {
    return new TCharacterSummary(response);
  }
}

export type ObjectProp = {
  type: string,
  name: string,
};

export type ObjectPropRef = {
  key: PropRefLink,
  name: string,
  id: number,
};

export type PropRefLink = {
  href: string;
};

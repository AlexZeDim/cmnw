import { ArrayContains, Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';
import { cryptoRandomIntBetween } from '@app/core/utils';
import { NotFoundException } from '@nestjs/common';

export const getKey = async (
  repository: Repository<KeysEntity>,
  clearance: string,
) => {
  const keyEntity = await repository.findOneBy({
    tags: ArrayContains([clearance]),
  });
  if (!keyEntity) {
    throw new NotFoundException(`${clearance} keys found`);
  }
  return keyEntity;
};

export const getKeys = async (
  repository: Repository<KeysEntity>,
  clearance: string,
  isRandom = false,
) => {
  const keyEntities = await repository.findBy({
    tags: ArrayContains([clearance]),
  });
  if (!keyEntities.length) {
    throw new NotFoundException(`${keyEntities.length} keys found`);
  }
  return isRandom && keyEntities.length > 1
    ? [keyEntities[cryptoRandomIntBetween(0, keyEntities.length - 1)]]
    : keyEntities;
};

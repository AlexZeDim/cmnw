import { ArrayContains, LessThan, Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';
import { cryptoRandomIntBetween } from '@app/core/utils';
import { NotFoundException } from '@nestjs/common';
import { KEY_LOCK_ERRORS_NUM } from '@app/core/constants';

export const getKey = async (
  repository: Repository<KeysEntity>,
  clearance: string,
) => {
  const keyEntity = await repository.findOneBy({
    tags: ArrayContains([clearance]),
    errorCounts: LessThan(KEY_LOCK_ERRORS_NUM),
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
    errorCounts: LessThan(KEY_LOCK_ERRORS_NUM),
  });
  if (!keyEntities.length) {
    throw new NotFoundException(`${keyEntities.length} keys found`);
  }
  return isRandom && keyEntities.length > 1
    ? [keyEntities[cryptoRandomIntBetween(0, keyEntities.length - 1)]]
    : keyEntities;
};

export const incErrorCount = async (
  repository: Repository<KeysEntity>,
  token: string,
) => {
  const keyEntity = await repository.findOneBy({ token });
  keyEntity.errorCounts = keyEntity.errorCounts + 1;
  await repository.save(keyEntity);
};

import { ArrayContains, LessThan, Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';
import { cryptoRandomIntBetween } from '@app/core/utils';
import { NotFoundException } from '@nestjs/common';
import { KEY_LOCK_ERRORS_NUM } from '@app/core/constants';

export const getKey = async (
  repository: Repository<KeysEntity>,
  clearance: string,
  isSafe = true,
) => {
  const findBy = isSafe
    ? {
        tags: ArrayContains([clearance]),
        errorCounts: LessThan(KEY_LOCK_ERRORS_NUM),
      }
    : {
        tags: ArrayContains([clearance]),
      };

  const keyEntity = await repository.findOneBy(findBy);
  if (!keyEntity) {
    throw new NotFoundException(`${clearance} keys found`);
  }
  return keyEntity;
};

export const getKeys = async (
  repository: Repository<KeysEntity>,
  clearance: string,
  isRandom = false,
  isSafe = true,
) => {
  const findBy = isSafe
    ? {
        tags: ArrayContains([clearance]),
        errorCounts: LessThan(KEY_LOCK_ERRORS_NUM),
      }
    : {
        tags: ArrayContains([clearance]),
      };

  const keyEntities = await repository.findBy(findBy);
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

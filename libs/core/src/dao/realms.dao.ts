import { Repository } from 'typeorm';
import { RealmsEntity } from '@app/pg';

export const findRealm = async (
  repository: Repository<RealmsEntity>,
  query: string,
) => {
  return await repository.findOne({
    where: [
      {
        name: query,
      },
      {
        slug: query,
      },
      {
        locale: query,
      },
    ],
  });
};

import { Repository } from 'typeorm';
import { RealmsEntity } from '@app/pg';
import { toSlug } from '@app/core/utils';

export const findRealm = async (
  repository: Repository<RealmsEntity>,
  query: string,
) => {
  const slug = toSlug(query);
  return await repository.findOne({
    where: [
      {
        name: query,
      },
      {
        slug: slug,
      },
      {
        localeName: query,
      },
      {
        localeSlug: slug,
      },
    ],
  });
};

import { Repository } from 'typeorm';
import { MarketEntity } from '@app/pg';

/**
 * Calculate the 10th percentile using PERCENTILE_CONT
 * This returns an interpolated value
 */
export const getPercentile95Cont = async (
  repository: Repository<MarketEntity>,
  itemId: number,
  timestamp: number
): Promise<number> => {
  // Create query builder
  const queryBuilder = repository
    .createQueryBuilder('markets')
    .select('PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY markets.price)', 'percentile95');

  // Add optional category filter
  queryBuilder.where('markets.item_id = :itemId', { itemId: itemId });
  queryBuilder.andWhere('markets.timestamp = :timestamp', { timestamp: timestamp });

  const result = await queryBuilder.getRawOne();
  return result.percentile95;
}

export const getPercentileTypeByItemAndTimestamp = async (
  repository: Repository<MarketEntity>,
  type: 'CONT' | 'DISC',
  percentile: number,
  itemId: number,
  timestamp: number,
  isGold = false,
  connectedRealmId?: number,
): Promise<number> => {
  let query = `
      SELECT PERCENTILE_${type}(${percentile}) WITHIN GROUP (ORDER BY price) as percentile
      FROM market
    `;

  const params = [];

  const addWhere = isGold
    ? ' WHERE item_id = $1 AND timestamp = $2 AND connected_realm_id = $3 AND is_online = true'
    : ' WHERE item_id = $1 AND timestamp = $2'

  query += addWhere;

  params.push(itemId);
  params.push(timestamp);

  if (connectedRealmId) {
    params.push(connectedRealmId);
  }

  const result = await repository.query(query, params);
  return result[0].percentile;
}

import { toGold } from '@app/core/utils/converters';
import { BlizzardApiNamedField, ConvertPrice } from '@app/core/types';

export const transformNamedField = <T extends object>(value: T, key = 'name') => {
  if (!value) return null;

  const isNamed = typeof value === 'object' && key in value;
  const isString = isNamed
    ? typeof value[key] === 'string'
    : typeof value === 'string';
  const isNumber = isNamed
    ? typeof value[key] === 'number'
    : typeof value === 'number';

  if (isNamed && (isString || isNumber)) {
    return isNaN(value[key]) ? value[key] : parseInt(value[key]);
  }

  if (isNamed) return value[key] || null;

  return value;
};

export const isFieldNamed = <T extends object>(value: T): boolean => {
  return typeof value === 'object' && 'name' in value;
};

export const transformConnectedRealmId = <T extends object>(value: T) => {
  const hasHref = value && 'connected_realm' in value;
  if (!hasHref) return null;

  const { href } = value.connected_realm as BlizzardApiNamedField;

  const connectedRealmId = parseInt((href as string).replace(/\D/g, ''));
  const isNaNConnectedRealmId = connectedRealmId && !isNaN(connectedRealmId);

  if (!isNaNConnectedRealmId) return null;

  return connectedRealmId;
};

export const transformPrice = (order: ConvertPrice) => {
  if (order.unit_price) return toGold(order.unit_price);
  if (order.buyout) return toGold(order.buyout);
  if (order.bid) return toGold(order.bid);
  return undefined;
};

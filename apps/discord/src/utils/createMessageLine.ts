import { IAAuctionOrder } from '@app/core';
import { Item } from '@app/mongo';

export function createMessageLine(
  order: IAAuctionOrder,
  tradeHub: string,
  item: Item | number,
): string {
  let
    name: string,
    quantity: string,
    price: string;

  if (item && item instanceof Item && item.ticker) {
    name = item.ticker;
  } else if (item && item instanceof Item && item.name.en_GB) {
    name = item.name.en_GB;
  } else if (item instanceof Item && item._id) {
    name = item._id.toString();
  } else if (typeof item === 'number') {
    name = item.toString();
  }

  quantity = `x${order.quantity}`.padEnd(7);

  if (order.price) {
    price = `${order.price.toLocaleString('ru-RU').replace(',', '.')}g`.padEnd(16);
  } else if (order.buyout) {
    price = `${order.buyout.toLocaleString('ru-RU').replace(',', '.')}g`.padEnd(16);
  } else if (order.bid) {
    price = `${order.bid.toLocaleString('ru-RU').replace(',', '.')}g`.padEnd(16);
  }

  return `\`| C | ${tradeHub} | ${quantity} | ${price} | ${name}\`\n`;
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Contract, Gold, Item, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ContractAggregation } from '@app/core';
import moment from 'moment';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(
    ContractsService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @InjectModel(Contract.name)
    private readonly ContractModel: Model<Contract>,
    @InjectModel(Auction.name)
    private readonly AuctionModel: Model<Auction>,
    @InjectModel(Gold.name)
    private readonly GoldModel: Model<Gold>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) { }

  @Cron('00 10,18 * * *')
  async buildContracts() {
    this.logger.log('buildContracts started');

    const { auctions } = await this.RealmModel
      .findOne({ region: 'Europe' })
      .lean()
      .select('auctions')
      .sort({ 'auctions': 1 });

    const date = {
      d: moment().get('date'),
      w: moment().get('week'),
      m: moment().get('month') + 1,
      y: moment().get('year'),
    };

    const YTD: Date = moment.utc().subtract(1, 'day').toDate();

    const T: number = auctions - (1000 * 60 * 60 * 8);

    await this.ItemModel
      .find({ contracts: true })
      .lean()
      .cursor()
      .eachAsync(async (item) => {
        try {
          const Model = item._id === 1 ? this.GoldModel : this.AuctionModel;

          const matchStage = item._id === 1 ? {
            $match: {
              createdAt: {
                $gt: YTD,
              },
              status: 'Online',
            }
          } : {
            $match: {
              last_modified: { $gte: T },
              item_id: item._id,
            }
          };

          const groupStage = item._id === 1 ? {
            $group: {
              _id: {
                connected_realm_id: '$connected_realm_id',
                last_modified: '$last_modified',
              },
              open_interest: {
                $sum: {
                  $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                },
              },
              quantity: { $sum: '$quantity' },
              price: { $min: '$price' },
              price_size_array: {
                $addToSet: {
                  $cond: {
                    if: { $gte: ['$quantity', 1000000] },
                    then: '$price',
                    else: "$$REMOVE"
                  }
                }
              },
              sellers: { $addToSet: '$owner' },
            }
          } : {
            $group: {
              _id: {
                connected_realm_id: '$connected_realm_id',
                item_id: '$item_id',
                last_modified: '$last_modified',
              },
              open_interest: {
                $sum: {
                  $multiply: ['$price', '$quantity'],
                },
              },
              quantity: { $sum: '$quantity' },
              price: { $min: '$price' },
              price_size_array: {
                $addToSet: {
                  $cond: {
                    if: { $gte: ['$quantity', item.stackable || 1] },
                    then: '$price',
                    else: "$$REMOVE"
                  }
                }
              },
              orders: {
                $push: {
                  id: '$id',
                  time_left: '$time_left',
                },
              },
            }
          };

          const projectStage = item._id === 1 ? {
            $project: {
              connected_realm_id: '$_id.connected_realm_id',
              last_modified: '$_id.last_modified',
              price: '$price',
              price_size: {
                $cond: {
                  if: { $gte: [{ $size: "$price_size_array" }, 1] },
                  then: { $min: '$price_size_array' },
                  else: "$price"
                }
              },
              quantity: '$quantity',
              open_interest: '$open_interest',
              sellers: '$sellers',
            }
          } : {
            $project: {
              item_id: '$_id.item_id',
              connected_realm_id: '$_id.connected_realm_id',
              last_modified: '$_id.last_modified',
              price: '$price',
              price_size: {
                $cond: {
                  if: { $gte: [{ $size: "$price_size_array" }, 1] },
                  then: { $min: '$price_size_array' },
                  else: "$price"
                }
              },
              quantity: '$quantity',
              open_interest: '$open_interest',
              orders: '$orders',
            }
          };

          const addStage = {
            $addFields: {
              _id: {
                $concat: [
                  {
                    $convert: {
                      input: '$_id.item_id',
                      to: 'string',
                    },
                  },
                  '-',
                  {
                    $convert: {
                      input: '$_id.last_modified',
                      to: 'string',
                    },
                  },
                  '@',
                  {
                    $convert: {
                      input: '$_id.connected_realm_id',
                      to: 'string',
                    },
                  },
                ],
              },
              item_id: 1,
              date: {
                day: date.d,
                week: date.w,
                month: date.m,
                year: date.y,
              },
            },
          };

          await Model
            .aggregate<ContractAggregation>([
              matchStage,
              groupStage,
              projectStage,
              addStage,
            ])
            .allowDiskUse(true)
            .cursor()
            .eachAsync(async (contract: ContractAggregation) => {
              try {
                const contractExists = await this.ContractModel.findById(contract._id);
                if (!contractExists) await this.ContractModel.create(contract);

                const flag = !!contractExists ? 'errorException' : 'C';
                const contractName = item.ticker ? item.ticker : item.name.en_GB;

                this.logger.log(`buildContract: ${flag} | ${contractName} | ${contract._id}`);
              } catch (errorOrException) {
                this.logger.error(errorOrException);
                this.logger.error(`buildContract: fail to create contract for item: ${item._id}`);
              }
            }, { parallel: 4 });
        } catch (errorException) {
          this.logger.error(errorException);
        }
      })
  }
}

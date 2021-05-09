import { MiddlewareConsumer, Module } from '@nestjs/common';
import { redisConfig } from '@app/configuration';
import { BullModule, BullQueueInject } from '@anchan828/nest-bullmq';
import {
  auctionsQueue,
  charactersQueue,
  guildsQueue,
  itemsQueue,
  pricingQueue,
  realmsQueue,
  valuationsQueue,
} from '@app/core';
import { createBullBoard } from 'bull-board';
import { BullMQAdapter } from 'bull-board/bullMQAdapter';
import { Queue } from 'bullmq';
import { Express } from 'express';

@Module({
  imports: [
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(auctionsQueue.name),
    BullModule.registerQueue(charactersQueue.name),
    BullModule.registerQueue(guildsQueue.name),
    BullModule.registerQueue(realmsQueue.name),
    BullModule.registerQueue(itemsQueue.name),
    BullModule.registerQueue(pricingQueue.name),
    BullModule.registerQueue(valuationsQueue.name),
  ],
  controllers: [],
  providers: [],
})
export class QueueModule {

  private router: Express;

  constructor (
    @BullQueueInject(auctionsQueue.name)
    private readonly auctions: Queue,
    @BullQueueInject(charactersQueue.name)
    private readonly characters: Queue,
    @BullQueueInject(guildsQueue.name)
    private readonly guilds: Queue,
    @BullQueueInject(realmsQueue.name)
    private readonly realms: Queue,
    @BullQueueInject(itemsQueue.name)
    private readonly items: Queue,
    @BullQueueInject(pricingQueue.name)
    private readonly pricing: Queue,
    @BullQueueInject(valuationsQueue.name)
    private readonly valuations: Queue,

  ) {
    const { router } = createBullBoard([
      new BullMQAdapter(this.auctions, { readOnlyMode: false }),
      new BullMQAdapter(this.characters, { readOnlyMode: false }),
      new BullMQAdapter(this.guilds, { readOnlyMode: false }),
      new BullMQAdapter(this.realms, { readOnlyMode: false }),
      new BullMQAdapter(this.items, { readOnlyMode: false }),
      new BullMQAdapter(this.pricing, { readOnlyMode: false }),
      new BullMQAdapter(this.valuations, { readOnlyMode: false }),
    ])
    this.router = router;
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(this.router)
      .forRoutes('/queues');
  }
}

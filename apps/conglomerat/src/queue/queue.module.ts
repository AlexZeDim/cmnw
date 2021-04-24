import { MiddlewareConsumer, Module } from '@nestjs/common';
import { redisConfig } from '@app/configuration';
import { BullModule, BullQueueInject } from '@anchan828/nest-bullmq';
import { auctionsQueue, charactersQueue, guildsQueue, realmsQueue } from '@app/core';
import { BullMQAdapter, router, setQueues } from 'bull-board';
import { Queue } from 'bullmq';

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
  ],
  controllers: [],
  providers: [],
})
export class QueueModule {

  constructor (
    @BullQueueInject(auctionsQueue.name)
    private readonly auctions: Queue,
    @BullQueueInject(charactersQueue.name)
    private readonly characters: Queue,
    @BullQueueInject(guildsQueue.name)
    private readonly guilds: Queue,
    @BullQueueInject(realmsQueue.name)
    private readonly realms: Queue,
  ) {
    setQueues([
      new BullMQAdapter(this.auctions, { readOnlyMode: false }),
      new BullMQAdapter(this.characters, { readOnlyMode: false }),
      new BullMQAdapter(this.guilds, { readOnlyMode: false }),
      new BullMQAdapter(this.realms, { readOnlyMode: false }),
    ])
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(router)
      .forRoutes('/admin/queues');
  }
}

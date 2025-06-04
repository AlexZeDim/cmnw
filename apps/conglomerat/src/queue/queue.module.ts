import { MiddlewareConsumer, Module } from '@nestjs/common';
import { redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from 'nestjs-bull-board';
import { Express } from 'express';
import {
  auctionsQueue,
  charactersQueue,
  guildsQueue,
  itemsQueue,
  pricingQueue,
  realmsQueue,
  valuationsQueue,
} from '@app/core';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
    }),
    BullModule.registerQueue({
      name: realmsQueue.name,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
    }),
    BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
    BullBoardModule.forFeature(...QueueListBoard),
  ],
  controllers: [],
  providers: [],
})
export class QueueModule {
  private router: Express;

  constructor(

  ) {
    this.router = router;
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(this.router).forRoutes('/queues');
  }
}

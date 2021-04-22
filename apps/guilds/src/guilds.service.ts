import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { GLOBAL_KEY } from '@app/core';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(
    GuildsService.name, true,
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(guildsQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexGuilds(GLOBAL_KEY)
  }

  async indexGuilds(clearance: string) {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) return
      await this.queue.add('депортация@gordunni', {
        _id: 'депортация@gordunni',
        name: 'Депортация',
        realm: 'Gordunni',
        members: [],
        region: 'eu',
        clientId: keys[0]._id,
        clientSecret: keys[0].secret,
        accessToken: keys[0].token,
      }, {
        jobId: 'депортация@gordunni'
      })
    } catch (e) {
      this.logger.error(`${GuildsService.name}, ${e}`)
    }
  }
}

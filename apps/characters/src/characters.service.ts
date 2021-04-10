import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { GLOBAL_KEY, queueCharacters } from '@app/core';
import { Queue } from 'bullmq';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(
    CharactersService.name, true,
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(queueCharacters.name)
    private readonly queue: Queue,
  ) {
    this.indexCharacters(GLOBAL_KEY);
  }

  async indexCharacters(clearance: string): Promise<string> {
    const keys = await this.KeyModel.find({ tags: clearance });
    if (!keys.length) return

    const characters = [
      'инициатива@gordunni',
      'блюрателла@gordunni',
      'исмори@gordunni',
      'вандерплз@gordunni',
      'омниум@gordunni',
      'саске@gordunni',
      'акашагодх@gordunni',
      'нивей@gordunni',
    ]

    let i = 0;

    for (const character of characters) {
      console.log(`${i}:${character}`)
      await this.queue.add(character, {
        _id: character,
        region: 'eu',
        clientId: keys[i]._id,
        clientSecret: keys[i].secret,
        accessToken: keys[i].token,
      })
      i++
      if (i >= keys.length) {
        i = 0;
      }
    }

    return 'Hello World!';
  }
}

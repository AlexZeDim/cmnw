import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key } from '@app/mongo';
import { Model } from "mongoose";

@Injectable()
export class ValuationsService {
  private readonly logger = new Logger(
    ValuationsService.name, true,
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
  ) {
    this.buildAssetClasses()
  }

  async buildAssetClasses(): Promise<void> {
    // TODO init?
    return;
  }
}

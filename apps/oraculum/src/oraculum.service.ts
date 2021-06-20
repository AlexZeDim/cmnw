import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Entity } from '@app/mongo';
import { Model } from 'mongoose';
import { NlpManager } from 'node-nlp';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

@Injectable()
export class OraculumService {
  private readonly logger = new Logger(
    OraculumService.name, true,
  );

  private manager = new NlpManager({
    languages: ['ru'],
    threshold: 0.8,
    builtinWhitelist: []
  });

  constructor(
    @InjectModel(Entity.name)
    private readonly EntityModel: Model<Entity>,
  ) {
    this.trainCorpusModel()
  }

  async trainCorpusModel(): Promise<void> {
    try {

      await this.EntityModel
        .find()
        .lean()
        .cursor()
        .eachAsync(entity => {
          this.manager.addNamedEntityText(entity.entityName, entity.optionName, entity.languages, entity.texts);
        });

      await this.manager.train();

      const corpus = await this.manager.export(false) as string;

      const dir = path.join(__dirname, '..', '..', '..', 'files');
      await fs.ensureDir(dir);

      const file = path.join(__dirname, '..', '..', '..', 'files', 'corpus.json');
      const fileExist = fs.existsSync(file);

      if (!fileExist) {
        this.logger.log(`Creating new corpus: ${file}`);
        fs.writeFileSync(file, corpus);
      }

      if (fileExist) {
        const data = fs.readFileSync(file, 'utf8');
        const existCorpus = crypto
          .createHash('md5')
          .update(data, 'utf8')
          .digest('hex');

        const newCorpus = crypto
          .createHash('md5')
          .update(corpus, 'utf8')
          .digest('hex');

        if (existCorpus !== newCorpus) {
          this.logger.log(`Overwriting corpus hash ${existCorpus} with new: ${newCorpus}`);
          fs.writeFileSync(file, corpus, { encoding: 'utf8', flag: 'w' });
        }
      }

/*    const e = await this.manager.extractEntities(
        'ru',
        'Блюрателла пошла в уинивермаг',
      );
      console.log(e);*/
    } catch (e) {
      this.logger.error(`trainCorpusModel: ${e}`)
    }
  }
}

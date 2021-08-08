import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { NlpManager } from 'node-nlp';
import path from 'path';
import fs from 'fs-extra';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Message } from '@app/mongo';
import { EXIT_CODES } from '@app/core';

// @ts-ignore
import Discord from 'discord-agent';


@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client

  private commands: Discord.Collection<string, any>

  private manager = new NlpManager({
    languages: ['ru'],
    threshold: 0.8,
    builtinWhitelist: []
  });

  constructor(
    @InjectModel(Key.name)
    private readonly KeysModel: Model<Key>,
    @InjectModel(Message.name)
    private readonly MessagesModel: Model<Message>,
  ) { }

  private readonly logger = new Logger(
    OracleService.name, true,
  );

  async onApplicationBootstrap(): Promise<void> {
    const dir = path.join(__dirname, '..', '..', '..', 'files');
    await fs.ensureDir(dir);

    const file = path.join(__dirname, '..', '..', '..', 'files', 'corpus.json');
    const fileExist = fs.existsSync(file);

    if (!fileExist) {
      this.logger.warn(`Corpus from: ${file} not found!`)
      return;
    }

    const corpus = fs.readFileSync(file, 'utf8');

    await this.manager.import(corpus);

    this.client = new Discord.Client({
      ws: {
        large_threshold: 1000000,
        compress: true,
      }
    });

    const key = await this.KeysModel.findOne({ tags: { $all: [ 'discord', 'free' ] } });
    if (!key) {
      this.logger.warn('Available keys not found!');
      return;
    }

    key.tags.pull('free');
    key.tags.addToSet('taken');

    await key.save();
    await this.client.login(key.token);
    this.commands = new Discord.Collection();

    this.logger.warn(`Key ${key.token} has been taken!`);

    EXIT_CODES.forEach((eventType) => process.on(eventType,  async () => {
      key.tags.pull('taken');
      key.tags.addToSet('free');

      await key.save();
      this.logger.warn(`Key ${key.token} has been released!`);
    }));

    await this.bot();
  }

  private async bot(): Promise<void> {
    try {
      this.client.on('ready', () => this.logger.log(`Logged in as ${this.client.user.tag}!`));

      this.client.on('message', async (message: Discord.Message) => {

        if (message.author.bot) return;

        try {
          console.log(message);
          console.log(message.author);
          // TODO execute command only for clearance personal
          // if (message.author.id === '240464611562881024') await message.send('My watch is eternal');
          // const match = await this.manager.extractEntities('ru', message.content);
          // console.log(match)
        } catch (errorException) {
          this.logger.error(`Error: ${errorException}`);
        }
      });

      this.client.on('voiceStateUpdate', async (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {
        console.log(oldMember, newMember);
      });

      // TODO generate invites

      // TODO join servers

    /*
      for (const [guild_id] of this.client.guilds) {
        const guild = this.client.guilds.get(guild_id);
        const members = await guild.fetchMembers();
        console.log(members);
      }*/
    } catch (errorException) {
      this.logger.error(errorException);
    }


/*    for (const user of this.client.users) {
      console.log(user)
    }*/

  }
}

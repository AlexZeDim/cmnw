import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { NlpManager } from 'node-nlp';
// @ts-ignore Nzk3OTIzNTIzOTEzMTg3MzM4.YMyy7w.V_r9TAUGQdW7iCGz5wtJBQv6FW4
import Discord from 'discord-agent';
import path from "path";
import fs from 'fs-extra';

@Injectable()
export class OracleService implements OnApplicationBootstrap {
  private client: Discord.Client

  private commands: Discord.Collection<string, any>

  private manager = new NlpManager({
    languages: ['ru'],
    threshold: 0.8,
    builtinWhitelist: []
  });

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
      fetchAllMembers: true,
      disabledEvents: ['READY'],
      ws: {
        large_threshold: 1000000,
        compress: true,
      }
    });
    this.commands = new Discord.Collection();

    await this.client.login('Nzk3OTIzNTIzOTEzMTg3MzM4.YMyy7w.V_r9TAUGQdW7iCGz5wtJBQv6FW4');
    this.bot()
  }

  private async bot(): Promise<void> {
    try {
      this.client.on('ready', () => this.logger.log(`Logged in as ${this.client.user.tag}!`));

      for (const [guild_id] of this.client.guilds) {
        const guild = this.client.guilds.get(guild_id);
        const members = await guild.fetchMembers();
        console.log(members);
      }
    } catch (e) {
      this.logger.error(e);
    }


/*    for (const user of this.client.users) {
      console.log(user)
    }*/

/*    this.client.on('message', async message => {

      if (message.author.bot) return;

      try {
        // TODO execute command only for clearance personal
        // if (message.author.id === '240464611562881024') await message.send('My watch is eternal');
        // const match = await this.manager.extractEntities('ru', message.content);
        // console.log(match)
      } catch (e) {
        this.logger.error(`Error: ${e}`);
      }
    })*/
  }
}

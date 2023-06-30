import { Logger } from '@nestjs/common';
import { Browser, BrowserContext, chromium, devices } from 'playwright';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import cheerio from 'cheerio';
import {
  BullQueueInject,
  BullWorker,
  BullWorkerProcess,
} from '@anchan828/nest-bullmq';

import {
  CHARACTER_RAID_DIFFICULTY,
  OSINT_SOURCE_RAIDER_IO,
  OSINT_SOURCE_WOW_PROGRESS,
  OSINT_SOURCE_WCL,
  ProfileJobQueue,
  profileQueue,
  CHARACTER_PROFILE_MAPPING,
  WowProgressProfile,
  WarcraftLogsProfile,
  ICharacterRaiderIo,
  isRaiderIoProfile,
  CHARACTER_PROFILE_RIO_MAPPING,
  RaiderIoCharacterMappingKey,
  findRealm,
} from '@app/core';

@BullWorker({
  queueName: profileQueue.name,
  options: profileQueue.workerOptions,
})
export class ProfileWorker {
  private readonly logger = new Logger(ProfileWorker.name, {
    timestamp: true,
  });

  browser: Browser;
  browserContext: BrowserContext;

  constructor(
    private httpService: HttpService,
    @BullQueueInject(profileQueue.name)
    private readonly queue: Queue<ProfileJobQueue, number>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
  ) {}

  private async browserControl() {
    const isBrowserSession = Boolean(this.browser && this.browserContext);
    if (!isBrowserSession) return;

    const jobsNumber = await this.queue.count();
    if (!jobsNumber) {
      await this.browserContext.close();
      await this.browser.close();
    }
  }

  @BullWorkerProcess(profileQueue.workerOptions)
  public async process(job: Job<ProfileJobQueue, number>) {
    try {
      const { data: args } = job;

      let profileEntity = await this.charactersProfileRepository.findOneBy({
        guid: args.guid,
      });

      if (!profileEntity) {
        profileEntity = this.charactersProfileRepository.create({
          guid: args.guid,
        });
      }

      if (args.lookingForGuild) profileEntity.lfgStatus = args.lookingForGuild;

      /**
       * update RIO, WCL & Progress
       * by request from args
       */
      if (args.updateRIO) {
        const raiderIo = await this.getRaiderIoProfile(args.name, args.realm);

        Object.assign(profileEntity, raiderIo);
        await job.updateProgress(60);
      }

      if (args.updateWCL) {
        const warcraftLogs = await this.getWarcraftLogsProfile(
          args.name,
          args.realm,
        );

        Object.assign(profileEntity, warcraftLogs);
        await job.updateProgress(70);
      }

      if (args.updateWP) {
        const wowProgress = await this.getWowProgressProfile(args.name, args.realm);

        Object.assign(profileEntity, wowProgress);
        await job.updateProgress(80);
      }

      await this.charactersProfileRepository.save(profileEntity);
    } catch (errorOrException) {
      await job.log(errorOrException);
      this.logger.error(`${ProfileWorker.name}: ${errorOrException}`);
      return 500;
    }
  }

  private async getWarcraftLogsProfile(
    name: string,
    realmSlug: string,
    raidDifficulty: 'heroic' | 'mythic' = 'mythic',
  ): Promise<WarcraftLogsProfile> {
    const warcraftLogsProfile = this.charactersProfileRepository.create();
    try {
      const isBrowserLaunched = Boolean(this.browser);
      if (!isBrowserLaunched) {
        this.browser = await chromium.launch();
        this.browserContext = await this.browser.newContext(devices['iPhone 11']);
      }

      const difficulty = CHARACTER_RAID_DIFFICULTY.has(raidDifficulty)
        ? CHARACTER_RAID_DIFFICULTY.get(raidDifficulty)
        : CHARACTER_RAID_DIFFICULTY.get('mythic');

      const page = await this.browserContext.newPage();
      const url = encodeURI(
        `${OSINT_SOURCE_WCL}/${realmSlug}/${name}#difficulty=${difficulty.wclId}`,
      );

      await page.goto(url);
      const getBestPerfAvg = await page.getByText('Best Perf. Avg').allInnerTexts();
      const [getBestPerfAvgValue] = getBestPerfAvg;

      const [text, value] = getBestPerfAvgValue.trim().split('\n');

      const isLogsNumberValid = !isNaN(Number(value.trim()));
      if (isLogsNumberValid) {
        warcraftLogsProfile[difficulty.fieldName] = parseFloat(value);
      }

      return warcraftLogsProfile;
    } catch (errorOrException) {
      this.logger.error(`getWarcraftLogs: ${name}@${realmSlug}:${errorOrException}`);
      return warcraftLogsProfile;
    }
  }

  private async getWowProgressProfile(
    name: string,
    realmSlug: string,
  ): Promise<WowProgressProfile> {
    const wowProgressProfile = this.charactersProfileRepository.create();
    try {
      const { data } = await this.httpService.axiosRef.get<string>(
        encodeURI(`${OSINT_SOURCE_WOW_PROGRESS}/${realmSlug}/${name}`),
      );

      if (!data) return wowProgressProfile;

      const wowProgressProfilePage = cheerio.load(data);
      const wpHTML = wowProgressProfilePage.html('.language');

      await Promise.allSettled(
        wowProgressProfilePage(wpHTML).map((index, node) => {
          const characterText = wowProgressProfilePage(node).text();
          const [key, stringValue] = characterText.split(':');
          const isKeyExists = CHARACTER_PROFILE_MAPPING.has(key);
          if (!isKeyExists) return;

          const value = stringValue.trim();

          const fieldValueName = CHARACTER_PROFILE_MAPPING.get(key);
          if (fieldValueName === 'readyToTransfer')
            wowProgressProfile.readyToTransfer = value.includes('ready to transfer');

          if (fieldValueName === 'raidDays') {
            const [daysFrom, daysTo] = value.split(' - ');
            wowProgressProfile.raidDays = [parseInt(daysFrom), parseInt(daysTo)];
          }

          if (fieldValueName === 'languages') {
            wowProgressProfile.languages = value
              .split(',')
              .map((s) => s.toLowerCase().trim());
          }

          if (fieldValueName === 'battleTag' || fieldValueName === 'playRole') {
            wowProgressProfile[fieldValueName] = value;
          }
        }),
      );

      return wowProgressProfile;
    } catch (errorOrException) {
      this.logger.error(
        `getWowProgressProfile: ${name}@${realmSlug}:${errorOrException}`,
      );
      return wowProgressProfile;
    }
  }

  /**
   * @description
   * @param name
   * @param realmSlug
   * @private
   */
  private async getRaiderIoProfile(name: string, realmSlug: string) {
    const rioProfileCharacter = this.charactersProfileRepository.create();
    try {
      const { data: raiderIoProfile } =
        await this.httpService.axiosRef.get<ICharacterRaiderIo>(
          encodeURI(
            `${OSINT_SOURCE_RAIDER_IO}?region=eu&realm=${realmSlug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`,
          ),
        );

      const isRaiderIoProfileValid = isRaiderIoProfile(raiderIoProfile);
      if (!isRaiderIoProfileValid) return rioProfileCharacter;

      Object.entries(raiderIoProfile).forEach(([key, value]) => {
        const isKeyInProfile = CHARACTER_PROFILE_RIO_MAPPING.has(
          <RaiderIoCharacterMappingKey>key,
        );

        if (!isKeyInProfile) return;
        const fieldProfile = CHARACTER_PROFILE_RIO_MAPPING.get(
          <RaiderIoCharacterMappingKey>key,
        );
        rioProfileCharacter[fieldProfile] = value;
      });

      const realmEntity = await findRealm(
        this.realmsRepository,
        raiderIoProfile.realm,
      );
      if (realmEntity) rioProfileCharacter.realmId = realmEntity.id;

      rioProfileCharacter.raidProgress = raiderIoProfile.raid_progression;

      const [season] = raiderIoProfile.mythic_plus_scores_by_season;

      rioProfileCharacter.raiderIoScore = season.scores.all;

      return rioProfileCharacter;
    } catch (errorOrException) {
      this.logger.error(`getRaiderIO: ${name}@${realmSlug}:${errorOrException}`);
      return rioProfileCharacter;
    }
  }
}

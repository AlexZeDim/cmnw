import { Injectable, Logger } from '@nestjs/common';
import { Browser, BrowserContext, chromium, devices } from 'playwright';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import cheerio from 'cheerio';

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
  capitalize,
} from '@app/resources';

@Processor(profileQueue.name, profileQueue.workerOptions)
@Injectable()
export class ProfileWorker extends WorkerHost {
  private readonly logger = new Logger(ProfileWorker.name, {
    timestamp: true,
  });

  browser: Browser;
  browserContext: BrowserContext;

  constructor(
    private httpService: HttpService,
    @InjectQueue(profileQueue.name)
    private readonly queue: Queue<ProfileJobQueue, number>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
  ) {
    super();
  }

  private async browserControl() {
    const isBrowserSession = Boolean(this.browser && this.browserContext);
    if (!isBrowserSession) return;

    const jobsNumber = await this.queue.count();
    if (!jobsNumber) {
      await this.browserContext.close();
      await this.browser.close();
    }
  }

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
      this.logger.error({
        context: 'ProfileWorker',
        guid: job.data.guid,
        error: JSON.stringify(errorOrException),
      });

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
        this.browserContext = await this.browser.newContext(devices['iPhone 15 Pro Max landscape']);
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

      warcraftLogsProfile.updatedByWarcraftLogs = new Date();

      return warcraftLogsProfile;
    } catch (errorOrException) {
      this.logger.error({
        context: 'getWarcraftLogs',
        guid: `${name}@${realmSlug}`,
        error: JSON.stringify(errorOrException),
      });

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

          if (fieldValueName === 'raidDays' && value) {
            const [from, to] = value.split(' - ');
            const daysFrom = parseInt(from);
            const daysTo = parseInt(to);
            const isNumber =
              typeof daysFrom === 'number' && typeof daysTo === 'number';
            if (isNumber) wowProgressProfile.raidDays = [daysFrom, daysTo];
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

      wowProgressProfile.updatedByWowProgress = new Date();

      return wowProgressProfile;
    } catch (errorOrException) {
      this.logger.error({
        context: 'getWowProgressProfile',
        guid: `${name}@${realmSlug}`,
        error: JSON.stringify(errorOrException),
      });

      return wowProgressProfile;
    }
  }

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
        rioProfileCharacter[fieldProfile] =
          fieldProfile === 'gender' ? capitalize(value) : value;
      });

      const realmEntity = await findRealm(
        this.realmsRepository,
        raiderIoProfile.realm,
      );
      if (realmEntity) rioProfileCharacter.realmId = realmEntity.id;

      rioProfileCharacter.raidProgress = raiderIoProfile.raid_progression;

      const [season] = raiderIoProfile.mythic_plus_scores_by_season;

      rioProfileCharacter.raiderIoScore = season.scores.all;
      rioProfileCharacter.updatedByRaiderIo = new Date();

      return rioProfileCharacter;
    } catch (errorOrException) {
      this.logger.error({
        context: 'getRaiderIO',
        guid: `${name}@${realmSlug}`,
        error: JSON.stringify(errorOrException),
      });

      return rioProfileCharacter;
    }
  }
}

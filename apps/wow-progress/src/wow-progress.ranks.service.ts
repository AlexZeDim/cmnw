import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth'
import { Browser, Page } from 'playwright';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  CharacterJobQueue,
  charactersQueue,
  delay,
  GuildJobQueue,
  guildsQueue,
  ProfileJobQueue,
  profileQueue,
  formatBytes,
} from '@app/resources';


export interface WowProgressLink {
  href: string;
  text: string;
  fileName: string;
  isDownloaded: boolean;
}

export interface DownloadResult {
  success: boolean;
  fileName: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

export interface DownloadSummary {
  totalFiles: number;
  successful: number;
  failed: number;
  skipped: number;
  downloadPath: string;
  results: DownloadResult[];
}

@Injectable()
export class WowProgressRanksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WowProgressRanksService.name);
  private readonly baseUrl = 'https://www.wowprogress.com/export/ranks/';
  private readonly downloadPath = path.join(process.cwd(), 'files', 'wow-progress');
  private readonly maxRetries = 3;
  private readonly retryDelay = 2; // 2 seconds
  private readonly requestDelay = 1; // 1 second between requests

  private browser: Browser;
  private page: Page;

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
    @InjectQueue(profileQueue.name)
    private readonly queueProfile: Queue<ProfileJobQueue, number>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {
    chromium.use(stealth());
  }

  async onApplicationBootstrap(): Promise<void> {
    // await this.indexWowProgress(GLOBAL_OSINT_KEY, osintConfig.isIndexWowProgress);

    this.logger.log('Initializing WoW Progress Service...');

    try {
      await this.initializeBrowser();
      await this.ensureDownloadDirectory();

      // Optional: Start downloading on bootstrap
      await this.downloadAllRanks();

      this.logger.log('WoW Progress Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WoW Progress Service', error);
      throw error;
    }
  }

  /**
   * Initialize browser and page
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport and user agent
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      this.logger.log('Browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  /**
   * Ensure download directory exists
   */
  private async ensureDownloadDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.downloadPath)) {
        fs.mkdirSync(this.downloadPath, { recursive: true });
        this.logger.log(`Created download directory: ${this.downloadPath}`);
      }
    } catch (error) {
      this.logger.error('Failed to create download directory', error);
      throw error;
    }
  }

  /**
   * Parse all available rank files from the main directory
   */
  async parseAvailableFiles(): Promise<WowProgressLink[]> {
    try {
      this.logger.log('Parsing available files...');

      // Navigate to the main ranks directory
      await this.page.goto(this.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Extract all file links
      const links = await this.page.$$eval('a[href]', (anchors) => {
        return anchors
          .map(anchor => ({
            href: anchor.href,
            text: anchor.textContent?.trim() || ''
          }))
          .filter(link => {
            // Filter for actual rank files
            return link.href &&
              link.text &&
              !link.href.endsWith('../') &&
              !link.text.includes('HEADER.txt') &&
              (link.text.includes('.json.gz') || link.text.includes('.json'));
          });
      });

      // Process links and check if already downloaded
      const processedLinks: WowProgressLink[] = links.map(link => {
        const fileName = link.text.trim();
        const filePath = path.join(this.downloadPath, fileName);
        const isDownloaded = fs.existsSync(filePath);

        return {
          href: link.href,
          text: link.text,
          fileName,
          isDownloaded
        };
      });

      this.logger.log(`Found ${processedLinks.length} rank files`);
      this.logger.log(`Already downloaded: ${processedLinks.filter(l => l.isDownloaded).length}`);

      return processedLinks;
    } catch (error) {
      this.logger.error('Failed to parse available files', error);
      throw error;
    }
  }

  /**
   * Download a single file with retry logic
   */
  async downloadFile(link: WowProgressLink): Promise<DownloadResult> {
    const filePath = path.join(this.downloadPath, link.fileName);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      return {
        success: true,
        fileName: link.fileName,
        filePath,
        fileSize: fs.statSync(filePath).size
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Downloading ${link.fileName} (attempt ${attempt}/${this.maxRetries})`);

        const result = await this.downloadWithFetch(link.href, filePath);

        if (result.success) {
          this.logger.log(`✅ Downloaded: ${link.fileName} (${result.fileSize} bytes)`);
          return result;
        }

        if (attempt < this.maxRetries) {
          this.logger.warn(`Retrying ${link.fileName} in ${this.retryDelay}ms...`);
          await delay(this.retryDelay);
        }

      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed for ${link.fileName}:`, error.message);

        if (attempt === this.maxRetries) {
          return {
            success: false,
            fileName: link.fileName,
            error: error.message
          };
        }

        await delay(this.retryDelay);
      }
    }

    return {
      success: false,
      fileName: link.fileName,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Download file using fetch in browser context
   */
  private async downloadWithFetch(url: string, filePath: string): Promise<DownloadResult> {
    try {
      // First ensure we have a session by visiting the main page
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });

      // Download using fetch in browser context
      const result = await this.page.evaluate(async (downloadUrl) => {
        try {
          const response = await fetch(downloadUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/octet-stream, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Referer': 'https://www.wowprogress.com/export/ranks/',
              // @ts-ignore
              'User-Agent': navigator.userAgent
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          return {
            success: true,
            data: Array.from(new Uint8Array(arrayBuffer)),
            size: arrayBuffer.byteLength
          };

        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }, url);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save file
      const buffer = Buffer.from(result.data);
      fs.writeFileSync(filePath, buffer);

      return {
        success: true,
        fileName: path.basename(filePath),
        filePath,
        fileSize: result.size
      };

    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Download all rank files
   */
  async downloadAllRanks(forceRedownload = false): Promise<DownloadSummary> {
    try {
      this.logger.log('Starting bulk download of WoW Progress ranks...');

      const links = await this.parseAvailableFiles();
      const filesToDownload = forceRedownload ? links : links.filter(link => !link.isDownloaded);

      this.logger.log(`Downloading ${filesToDownload.length} files...`);

      const results: DownloadResult[] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < filesToDownload.length; i++) {
        const link = filesToDownload[i];

        this.logger.log(`Progress: ${i + 1}/${filesToDownload.length} - ${link.fileName}`);

        const result = await this.downloadFile(link);
        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
          this.logger.error(`Failed to download ${link.fileName}: ${result.error}`);
        }

        // Rate limiting between downloads
        if (i < filesToDownload.length - 1) {
          await delay(this.requestDelay);
        }
      }

      // Count skipped files
      skipped = links.length - filesToDownload.length;

      const summary: DownloadSummary = {
        totalFiles: links.length,
        successful,
        failed,
        skipped,
        downloadPath: this.downloadPath,
        results
      };

      this.logger.log(`Download Summary:`);
      this.logger.log(`  Total files: ${summary.totalFiles}`);
      this.logger.log(`  ✅ Successful: ${summary.successful}`);
      this.logger.log(`  ❌ Failed: ${summary.failed}`);
      this.logger.log(`  ⏭️ Skipped: ${summary.skipped}`);
      this.logger.log(`  📁 Location: ${summary.downloadPath}`);

      return summary;

    } catch (error) {
      this.logger.error('Bulk download failed', error);
      throw error;
    }
  }

  /**
   * Download specific server/tier combinations
   */
  async downloadSpecificFiles(filters: {
    servers?: string[];
    tiers?: string[];
    regions?: string[];
  }): Promise<DownloadSummary> {
    try {
      const allLinks = await this.parseAvailableFiles();

      // Filter based on criteria
      const filteredLinks = allLinks.filter(link => {
        const fileName = link.fileName.toLowerCase();

        // Check server filter
        if (filters.servers && filters.servers.length > 0) {
          const hasServer = filters.servers.some(server =>
            fileName.includes(server.toLowerCase())
          );
          if (!hasServer) return false;
        }

        // Check tier filter
        if (filters.tiers && filters.tiers.length > 0) {
          const hasTier = filters.tiers.some(tier =>
            fileName.includes(`tier${tier}`) || fileName.includes(`t${tier}`)
          );
          if (!hasTier) return false;
        }

        // Check region filter
        if (filters.regions && filters.regions.length > 0) {
          const hasRegion = filters.regions.some(region =>
            fileName.startsWith(region.toLowerCase())
          );
          if (!hasRegion) return false;
        }

        return true;
      });

      this.logger.log(`Filtered to ${filteredLinks.length} files based on criteria`);

      // Download filtered files
      const results: DownloadResult[] = [];

      for (const link of filteredLinks) {
        const result = await this.downloadFile(link);
        results.push(result);

        await delay(this.requestDelay);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        totalFiles: filteredLinks.length,
        successful,
        failed,
        skipped: 0,
        downloadPath: this.downloadPath,
        results
      };

    } catch (error) {
      this.logger.error('Specific download failed', error);
      throw error;
    }
  }

  /**
   * Extract and parse a downloaded .json.gz file
   */
  async extractFile(fileName: string): Promise<any> {
    try {
      const filePath = path.join(this.downloadPath, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileName}`);
      }

      const fileBuffer = fs.readFileSync(filePath);

      // Decompress if .gz file
      let decompressed: Buffer;
      if (fileName.endsWith('.gz')) {
        const gunzip = promisify(zlib.gunzip);
        decompressed = await gunzip(fileBuffer);
      } else {
        decompressed = fileBuffer;
      }

      // Parse JSON
      const jsonData = JSON.parse(decompressed.toString('utf8'));

      this.logger.log(`Extracted ${fileName}: ${JSON.stringify(jsonData).length} characters`);
      return jsonData;

    } catch (error) {
      this.logger.error(`Failed to extract ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get download statistics
   */
  getDownloadStats(): {
    downloadPath: string;
    totalFiles: number;
    totalSize: string;
    files: Array<{ name: string; size: number; modified: Date; }>;
  } {
    try {
      if (!fs.existsSync(this.downloadPath)) {
        return {
          downloadPath: this.downloadPath,
          totalFiles: 0,
          totalSize: '0 B',
          files: []
        };
      }

      const files = fs.readdirSync(this.downloadPath)
        .map(fileName => {
          const filePath = path.join(this.downloadPath, fileName);
          const stats = fs.statSync(filePath);
          return {
            name: fileName,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        downloadPath: this.downloadPath,
        totalFiles: files.length,
        totalSize: formatBytes(totalSize),
        files
      };

    } catch (error) {
      this.logger.error('Failed to get download stats', error);
      throw error;
    }
  }

  /**
   * Clean up browser resources
   */
  async onApplicationShutdown(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.log('Browser resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

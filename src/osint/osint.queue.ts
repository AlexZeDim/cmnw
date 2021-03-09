import { JobsOptions, Queue } from "bullmq";
import { connectionRedis } from "../db/redis/connectionRedis";

const osintOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueCharacters = new Queue('OSINT:Characters', {connection: connectionRedis, defaultJobOptions: osintOptions});
const queueGuilds = new Queue('OSINT:Guilds', {connection: connectionRedis, defaultJobOptions: osintOptions});
const queueRealms = new Queue('OSINT:Realms', {connection: connectionRedis, defaultJobOptions: osintOptions});
const queueFiles = new Queue('OSINT:Files', {connection: connectionRedis, defaultJobOptions: osintOptions});
const queueLogs = new Queue('OSINT:Logs', {connection: connectionRedis, defaultJobOptions: osintOptions});

export {
  queueCharacters,
  queueGuilds,
  queueRealms,
  queueFiles,
  queueLogs
};

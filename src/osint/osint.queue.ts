import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../db/redis/redis.connection";

const osintOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

const queueCharacters = new Queue('OSINT:Characters', {connection: redisConnection, defaultJobOptions: osintOptions});
const queueGuilds = new Queue('OSINT:Guilds', {connection: redisConnection, defaultJobOptions: osintOptions});
const queueRealms = new Queue('OSINT:Realms', {connection: redisConnection, defaultJobOptions: osintOptions});
const queueFiles = new Queue('OSINT:Files', {connection: redisConnection, defaultJobOptions: osintOptions});
const queueLogs = new Queue('OSINT:Logs', {connection: redisConnection, defaultJobOptions: osintOptions});

export {
  queueCharacters,
  queueGuilds,
  queueRealms,
  queueFiles,
  queueLogs
};

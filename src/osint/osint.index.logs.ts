import '../db/mongo/connection';
import { queueLogs } from "./osint.queue";
import Xray from 'x-ray';

//TODO we crawl logs from WCL but only when realms ready!

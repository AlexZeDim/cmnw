import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job } from 'bullmq';
import { queueRealms } from '@app/core';

@BullWorker({ queueName: queueRealms.name })
export class OsintWorker {
  @BullWorkerProcess()
  public async process(job: Job): Promise<{ status: string }> {
    console.log(job)
    return { status: "ok" };
  }
}

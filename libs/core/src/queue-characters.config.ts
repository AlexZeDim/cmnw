import { JobsOptions } from "bullmq";

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const queueCharacters = {
  name: 'OSINT:Characters', options: queueOptions
}

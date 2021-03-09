import { setQueues, BullMQAdapter, router } from "bull-board/dist";
import { queueRealms, queueLogs } from "./osint/osint.queue";
import express from "express";

const app = express();

setQueues([
  new BullMQAdapter(queueRealms),
  new BullMQAdapter(queueLogs),
]);

app.use('/admin/queues', router)

app.listen(3000)

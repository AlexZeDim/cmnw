import { setQueues, BullMQAdapter, router } from "bull-board/dist";
import { queueRealms } from "./osint/osint.queue";
import express from "express";

const app = express();

setQueues([
  new BullMQAdapter(queueRealms),
]);

app.use('/admin/queues', router)

app.listen(3000)

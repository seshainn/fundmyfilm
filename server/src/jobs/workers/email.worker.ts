import "dotenv/config";
import { Worker } from "bullmq";
import { logger } from "../../config/logger.js";
import { createRedisConnection } from "../../services/redis.service.js";
import {
  type PaymentSuccessEmailJob
} from "../queues/email.queue.js";
import { sendPaymentSuccessEmail } from "../../services/email.service.js";

const worker = new Worker<PaymentSuccessEmailJob>(
  "email",
  async (job) => {
    if (job.name === "payment-success") {
      await sendPaymentSuccessEmail(job.data);
      return;
    }

    logger.warn(`Unknown email job: ${job.name}`);
  },
  {
    connection: createRedisConnection(),
    concurrency: 5
  }
);

worker.on("completed", (job) => {
  logger.info(`Email job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  logger.error(`Email job failed: ${job?.id} - ${err.message}`);
});

const shutdown = async () => {
  logger.info("Closing email worker...");
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Email worker started");
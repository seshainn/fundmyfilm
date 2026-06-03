import { Queue } from "bullmq";
import { createRedisConnection } from "../../services/redis.service.js";

export type PaymentSuccessEmailJob = {
  to: string;
  username: string;
  projectTitle: string;
  amount: number;
  paymentId: number;
  contributionId: number;
};

export const emailQueue = new Queue<PaymentSuccessEmailJob>("email", {
  connection: createRedisConnection()
});

export const queuePaymentSuccessEmail = async (
  payload: PaymentSuccessEmailJob
) => {
  await emailQueue.add("payment-success", payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  });
};
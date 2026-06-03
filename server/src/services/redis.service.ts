import { Redis } from "ioredis";
import ExpressError from "../config/expressError.js";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new ExpressError("Missing REDIS_URL", 500);
}

export const createRedisConnection = () =>
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null
  });

const redis = createRedisConnection();

export const connectRedis = async () => {
  try {
    const pong = await redis.ping();
    console.log("Redis connected:", pong);
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
};

export default redis;
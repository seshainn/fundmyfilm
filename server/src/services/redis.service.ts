import { Redis } from "ioredis";
import ExpressError from "../config/expressError.js";

if (!process.env.REDIS_URL) {
    throw new ExpressError("Missing REDIS_URL", 500);
}

const redis = new Redis(process.env.REDIS_URL);

export const connectRedis = async () => {
  try {
    const pong = await redis.ping();
    console.log("Redis connected:", pong);
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
};

export default redis;
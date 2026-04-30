import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

// Create the client
const redisClient = createClient({
    url: process.env.REDIS_URL
});

// Handle connection events
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("ready", () => console.log("✅ Redis connected"));

// Connect immediately
await redisClient.connect();

export { redisClient };
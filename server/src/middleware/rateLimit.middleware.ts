import redis from "../services/redis.service.js";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";
import { RateLimiterRedis } from "rate-limiter-flexible";

const generalRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:general",
  points: 60,
  duration: 60
});

const loginRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:login",
  points: 5,
  duration: 15 * 60
});

export const idOrIpRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = String(req.user?.id || req.ip || "unknown");

  generalRateLimiter
    .consume(key)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for key: ${key}`);
      res.status(429).json({ message: "Too many requests" });
    });
};

export const emailRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  loginRateLimiter
    .consume(String(email).toLowerCase())
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for email: ${email}`);
      res.status(429).json({ message: "Too many login attempts" });
    });
};
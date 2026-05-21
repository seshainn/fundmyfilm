import redis from "../services/redis.service.js";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";
import { RateLimiterRedis } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "middleware:ratelimiter",
  points: 5,
  duration: 1
})
export const idOrIpRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!req.ip) {
    res.status(400).json({ message: "Unable to determine client IP" });
    return;
  }
  const id = req.user?.id || req.ip
  rateLimiter.consume(id).then(() => {
    next()
  }).catch(() => {
    logger.warn(`Rate limit exceeded for user at IP: ${req.ip}`)
    res.status(429).json({ message: "Too many requests from the same user and IP" })
  })
}

export const emailRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body.email) {
    res.status(400).json({ message: "Unable to determine email of user" });
    return;
  }
  rateLimiter.consume(req.body.email).then(() => {
    next()
  }).catch(() => {
    logger.warn(`Rate limit exceeded for email: ${req.body.email}`)
    res.status(429).json({ message: "Too many login attempts from same email" })
  })
}
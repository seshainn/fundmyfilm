import express from "express";
import type { Request, Response, NextFunction } from "express";
import "dotenv/config";
import authRouter from "./modules/auth/auth.routes.js";
import projectsRouter from "./modules/projects/projects.routes.js";
import paymentRouter from "./modules/payment/payment.routes.js";
import { stripeWebhook } from "./modules/payment/payment.webhook.js";
import errorHandler from "./middleware/error.middleware.js";
import ExpressError from "./config/expressError.js";
import { logger } from "./config/logger.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import {
  metricsHandler,
  metricsMiddleware
} from "./config/metrics.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:5173", "http://localhost"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(helmet());

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/metrics", metricsHandler);

app.use(metricsMiddleware);

/**
 * Stripe webhook must use raw body BEFORE express.json().
 */
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(cookieParser());

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`Request Received: ${req.method} ${req.path}`);
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/payments", paymentRouter);

app.use((_req, _res, next) => {
  next(new ExpressError("Not Found", 404));
});

app.use(errorHandler);

export default app;
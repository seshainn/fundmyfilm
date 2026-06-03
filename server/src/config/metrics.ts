import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "produceafilm_"
});

export const httpRequestDuration = new client.Histogram({
  name: "produceafilm_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestDuration);

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.path === "/metrics") {
    return next();
  }

  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const route =
      req.route?.path && req.baseUrl
        ? `${req.baseUrl}${req.route.path}`
        : req.path;

    end({
      method: req.method,
      route,
      status_code: String(res.statusCode)
    });
  });

  next();
};

export const metricsHandler = async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
};
import express from "express";
import * as paymentController from "./payment.controller.js";
import { validateAccessToken } from "../../middleware/auth.middleware.js";
import { idOrIpRateLimiter } from "../../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post(
  "/",
  validateAccessToken,
  idOrIpRateLimiter,
  paymentController.paymentHandler
);

export default router;
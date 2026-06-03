import jwt from "jsonwebtoken";
import crypto from "crypto";
import ExpressError from "../../config/expressError.js";
import type { Response } from "express";

const REFRESH_COOKIE_PATH = "/api/auth";
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const sha256 = (input: string) => {
  return crypto.createHash("sha256").update(input).digest("hex");
};

export const generateTokens = (payload: { id: number; role: string }) => {
  if (!process.env.AUTH_SECRET_KEY) {
    throw new ExpressError("Missing AUTH_SECRET_KEY", 500);
  }

  const accessToken = jwt.sign(payload, process.env.AUTH_SECRET_KEY, {
    expiresIn: "15m"
  });

  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = sha256(refreshToken);
  const csrfToken = crypto.randomBytes(32).toString("hex");

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    csrfToken
  };
};

export const setAuthCookies = (
  res: Response,
  refreshToken: string,
  csrfToken: string
) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS
  });

  res.cookie("csrfToken", csrfToken, {
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: REFRESH_COOKIE_PATH
  });

  res.clearCookie("csrfToken", {
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/"
  });
};
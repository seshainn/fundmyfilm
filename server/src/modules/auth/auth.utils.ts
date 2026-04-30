import jwt from "jsonwebtoken"
import crypto from "crypto"
import ExpressError from "../../config/expressError.js"
import type { Response } from "express"

export const generateTokens = (payload: { id: number, role: string }) => {
    if (!process.env.AUTH_SECRET_KEY) {
        throw new ExpressError("Missing AUTH_SECRET_KEY", 500)
    }
    const accessToken = jwt.sign(payload, process.env.AUTH_SECRET_KEY, { expiresIn: "15m" })
    const refreshToken_unhashed = crypto.randomBytes(32).toString("hex")
    const refreshToken = sha256(refreshToken_unhashed)
    const csrfToken = crypto.randomBytes(32).toString("hex")
    return { accessToken, refreshToken, csrfToken }
}

export const setAuthCookies = (res: Response, refreshToken: string, csrfToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/auth/refresh"
  });

  res.cookie("csrfToken", csrfToken, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/refresh"
  });

  res.clearCookie("csrfToken", {
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
};

export const sha256 = (input: string) => {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");
};
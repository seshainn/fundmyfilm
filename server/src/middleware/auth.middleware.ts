import ExpressError from "../config/expressError.js";
import catchAsync from "../config/catchAsync.js";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export interface MyJwtPayload extends JwtPayload {
    id: number;
    role: string;
};

export const validateAccessToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ExpressError("Access token missing", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        throw new ExpressError("Access token not received at server", 401);
    }

    if (!process.env.AUTH_SECRET_KEY) {
      throw new ExpressError("Missing AUTH_SECRET_KEY", 500);
    }

    const decoded = jwt.verify(token, process.env.AUTH_SECRET_KEY) as MyJwtPayload;

    req.user = {
        id: decoded.id,
        role: decoded.role
    }

    next()

})

export const validateCsrfToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const csrfCookie = req.cookies?.csrfToken;
    const csrfHeader = req.headers["x-csrf-token"];

    if (!csrfCookie || !csrfHeader) {
      throw new ExpressError("CSRF token missing", 403);
    }

    if (csrfCookie !== csrfHeader) {
      throw new ExpressError("Invalid CSRF token", 403);
    }

    return next();
  }
);

export const validateRefreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No active session" });
    }
    //add db check here also for additional security  
    return next();
  }
);

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ExpressError("Forbidden", 403);
    }
    return next();
  };
};
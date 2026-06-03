import { registerUserSchemaZod, loginUserSchemaZod } from "./auth.model.js";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import catchAsync from "../../config/catchAsync.js";
import ExpressError from "../../config/expressError.js";
import { pool } from "../../config/db.js";
import {
  generateTokens,
  setAuthCookies,
  clearAuthCookies,
  sha256
} from "./auth.utils.js";

export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { username, email, password } = registerUserSchemaZod.parse(req.body);

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
    [username, email.toLowerCase(), password_hash]
  );

  res.status(201).json({ message: "User created successfully" });
});

export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = loginUserSchemaZod.parse(req.body);

  const userResult = await pool.query(
    "SELECT id, username, email, password_hash, role FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw new ExpressError("Invalid credentials", 401);
  }

  const user = userResult.rows[0];

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordCorrect) {
    throw new ExpressError("Invalid credentials", 401);
  }

  const {
    accessToken,
    refreshToken,
    refreshTokenHash,
    csrfToken
  } = generateTokens({
    id: user.id,
    role: user.role
  });

  await pool.query(
    `INSERT INTO refresh_tokens 
      (token_hash, user_id, email, expires_at) 
     VALUES 
      ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [refreshTokenHash, user.id, user.email]
  );

  setAuthCookies(res, refreshToken, csrfToken);

  res.status(200).json({
    message: "Login successful",
    accessToken
  });
});

export const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    const tokenHash = sha256(refreshToken);

    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
      tokenHash
    ]);
  }

  clearAuthCookies(res);

  res.status(200).json({ message: "Logged out" });
});

export const refreshTokenHandler = catchAsync(
  async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      throw new ExpressError("No active session", 401);
    }

    const tokenHash = sha256(rawRefreshToken);

    const tokenRecordResult = await pool.query(
      `SELECT 
          rt.token_hash,
          rt.user_id,
          rt.email,
          rt.expires_at,
          u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    const tokenRecord = tokenRecordResult.rows[0];

    if (!tokenRecord) {
      clearAuthCookies(res);
      throw new ExpressError("Invalid refresh token", 403);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
        tokenHash
      ]);

      clearAuthCookies(res);

      throw new ExpressError("Refresh token expired", 401);
    }

    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
      tokenHash
    ]);

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenHash: newRefreshTokenHash,
      csrfToken
    } = generateTokens({
      id: tokenRecord.user_id,
      role: tokenRecord.role
    });

    await pool.query(
      `INSERT INTO refresh_tokens 
        (token_hash, user_id, email, expires_at) 
       VALUES 
        ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [newRefreshTokenHash, tokenRecord.user_id, tokenRecord.email]
    );

    setAuthCookies(res, newRefreshToken, csrfToken);

    res.status(200).json({ accessToken });
  }
);
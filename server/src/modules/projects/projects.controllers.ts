import type { Request, Response } from "express";
import { pool } from "../../config/db.js";
import redis from "../../services/redis.service.js";
import catchAsync from "../../config/catchAsync.js";
import { deleteProjectCache } from "./projects.cache.js";

export const getProjects = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 2), 20);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const cacheKey = `projects:v1:limit:${limit}:offset:${offset}`;

  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const result = await pool.query(
    `SELECT 
        id,
        title,
        image,
        logline,
        budget,
        amount_collected
     FROM projects
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  await redis.set(cacheKey, JSON.stringify(result.rows), "EX", 300);

  res.status(200).json(result.rows);
});

/**
 * Prefer not to expose this publicly.
 * Contributions should update project amount only after successful payment.
 */
export const updateProjectAmount = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const contribution = Number(req.body.contribution);

    await pool.query(
      "UPDATE projects SET amount_collected = amount_collected + $1 WHERE id = $2",
      [contribution, id]
    );

    await deleteProjectCache();

    res.status(200).json({ message: "Contribution successful" });
  }
);
import { Request, Response } from "express";
import { pool } from "../../config/db.js";
import redis from "../../services/redis.service.js";

export const getProjects = async (req: Request, res: Response) => {
  const limit = 2; // Matches your frontend logic
  const offset = parseInt(req.query.offset as string) || 0;
  const cacheKey = `projects:offset:${offset}`;

  try {
    // 1. Check Redis Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Cache Miss: Query Database with Pagination
    const result = await pool.query(
      "SELECT * FROM projects ORDER BY id LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    // 3. Save to Redis (Set expiration, e.g., 1 hour)
    await redis.set(cacheKey, JSON.stringify(result.rows), "EX", 3600);

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects", error });
  }
};

export const updateProjectAmount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contribution } = req.body;

  try {
    // 1. Update the Database
    await pool.query(
      "UPDATE projects SET amount_collected = amount_collected + $1 WHERE id = $2",
      [contribution, id]
    );

    // 2. Invalidate the Cache
    // We delete every key that starts with "projects:offset:"
    const keys = await redis.keys("projects:offset:*");
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`🧹 Cache cleared: Deleted ${keys.length} pagination keys`);
    }

    res.status(200).json({ message: "Contribution successful" });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error });
  }
};
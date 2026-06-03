import redis from "../../services/redis.service.js";
import { logger } from "../../config/logger.js";

export const deleteProjectCache = async () => {
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "projects:v1:*",
      "COUNT",
      "100"
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += keys.length;
      await redis.del(...keys);
    }
  } while (cursor !== "0");

  if (deleted > 0) {
    logger.info(`Project cache cleared. Deleted ${deleted} keys.`);
  }
};
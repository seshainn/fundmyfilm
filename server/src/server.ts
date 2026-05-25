import app from "./app.js"
import { connectRedis } from "./services/redis.service.js"
import { logger } from "./config/logger.js"

export async function startServer() {
  await connectRedis()
  app.listen(process.env.PORT, () => {
    logger.info("Server is running on port 3000")
  })
}
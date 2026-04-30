import express from "express"
import "dotenv/config"
import authRouter from "./modules/auth/auth.routes.js"
import projectsRouter from "./modules/projects/projects.routes.js"
import errorHandler from "./middleware/error.middleware.js"
import { logger } from "./config/logger.js"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(helmet())
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/projects', projectsRouter)

app.use(errorHandler)

app.listen(process.env.PORT, () => {
    logger.info("Server is running on port 3000")
})
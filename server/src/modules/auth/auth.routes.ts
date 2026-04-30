import express from "express"
import * as authController from "./auth.controller.js"
import { validateRefreshToken } from "../../middleware/auth.middleware.js"

const router = express.Router()

router.post("/register", authController.registerUser)
router.post("/login", authController.loginUser)
router.post("/refresh", validateRefreshToken, authController.refreshTokenHandler)

export default router
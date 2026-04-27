import express from "express"
import * as authController from "./auth.controller.js"

const router = express.Router()

router.get("/register", authController.registerUser)
router.get("/login", authController.loginUser)

export default router 
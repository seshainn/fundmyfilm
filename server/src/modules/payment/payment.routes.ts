import express from "express"
import * as paymentController from "./payment.controller.js"
import { validateAccessToken } from "../../middleware/auth.middleware.js"

const router = express.Router()

router.post("/payment", validateAccessToken, paymentController.paymentHandler)

export default router
import express from "express"
import * as projectsController from "./projects.controllers.js"

const router = express.Router()

router.get("/", projectsController.getProjects)
router.post("/:id", projectsController.updateProjectAmount)

export default router
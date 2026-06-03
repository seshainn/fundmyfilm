import express from "express";
import * as projectsController from "./projects.controllers.js";
import { validateAccessToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", projectsController.getProjects);
router.post("/:id", validateAccessToken, projectsController.updateProjectAmount);

export default router;
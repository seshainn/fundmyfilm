import type {Response, Request, NextFunction} from "express"
import ExpressError from "../config/expressError.js"
import { logger } from "../config/logger.js"

const errorHandler = (
    err: ExpressError, 
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    logger.error(err.stack)
    res.status(err.statusCode || 500).json({ message: err.message || "Something went wrong"})
}

export default errorHandler
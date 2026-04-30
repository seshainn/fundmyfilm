import type {Response, Request, NextFunction} from "express"
import ExpressError from "../config/expressError.js"
import { logger } from "../config/logger.js"
import { DatabaseError } from "pg"
import jwt from "jsonwebtoken"

const PG_ERROR_MAP: Record<string, string> = {
  "23505": "Duplicate entry",
  "23503": "Invalid reference",
  "23502": "Missing required field",
  "23514": "Invalid value",
};
const errorHandler = (
    err: ExpressError | DatabaseError, 
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    logger.error(err.stack)
    if (err instanceof jwt.TokenExpiredError) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        
    } else if (err instanceof jwt.JsonWebTokenError) {
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
    }
    else if (err instanceof ExpressError) {
        res.status(err.statusCode || 500).json({ message: err.message || "Something went wrong"})   
        
    } else if (err instanceof DatabaseError && err.code) {
        if (err.code in PG_ERROR_MAP) {
            res.status(400).json({ message: PG_ERROR_MAP[err.code] || "Unknown database error"})    
        }
    } else {
        res.status(500).json({ message: "Something went wrong"})
    }
}

export default errorHandler
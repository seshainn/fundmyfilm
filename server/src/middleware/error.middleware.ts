import type {Response, Request, NextFunction} from "express"
import ExpressError from "../config/expressError.js"
import { logger } from "../config/logger.js"
import { DatabaseError } from "pg"
import jwt from "jsonwebtoken"
import { ZodError } from "zod";

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

    if (err instanceof Error) {
        logger.error(err.stack || err.message);
    } else {
        logger.error(String(err));
    }

    if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Token expired" });
    } 
    if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: "Invalid token" });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Validation failed",
            errors: err.issues
        });
    }
    if (err instanceof ExpressError) {
        res.status(err.statusCode || 500).json({ message: err.message || "Something went wrong"})     
    } 
    if (err instanceof DatabaseError) {
        const message =
        err.code && PG_ERROR_MAP[err.code]
            ? PG_ERROR_MAP[err.code]
            : "Database error";

        return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Something went wrong"})
    
}

export default errorHandler
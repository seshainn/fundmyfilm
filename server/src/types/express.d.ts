import type { MyJwtPayload } from "./auth.types.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: MyJwtPayload;
  }
}

export {};
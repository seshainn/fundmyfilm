import { z } from "zod"

export const registerUserSchemaZod = z.object({
  username: z.string().min(1),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(6),
  role: z.string().default("user"),
});

export const loginUserSchemaZod = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(6),
});
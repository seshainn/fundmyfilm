import { z } from "zod"

export const userSchemaZod = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});
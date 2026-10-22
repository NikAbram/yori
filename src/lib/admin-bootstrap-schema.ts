import { z } from "zod";

export const adminBootstrapSchema = z.object({
  email: z.string().trim().pipe(z.email()).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(160).default("Владелец YŌRI"),
});

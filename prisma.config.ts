import "dotenv/config";

import { defineConfig } from "prisma/config";

// Schema-only commands (validate, generate and migrate diff) must work before a
// Neon project is attached. The reserved .invalid host can never target a real
// database; migrate deploy still requires DIRECT_URL from the environment.
const schemaOnlyUrl = "postgresql://prisma:prisma@schema-only.invalid:5432/yori";
const directUrl = process.env.DIRECT_URL ?? schemaOnlyUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: directUrl },
});

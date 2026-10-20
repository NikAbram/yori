import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { createPostgresAdapter } from "@/lib/db/postgres-adapter";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create Prisma Client.");
  }

  return new PrismaClient({
    adapter: createPostgresAdapter(databaseUrl),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

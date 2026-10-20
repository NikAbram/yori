import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { createNeonHttpAdapter } from "../src/lib/db/neon-http-adapter";
import { createPostgresAdapter } from "../src/lib/db/postgres-adapter";

const useDirectConnection = process.env.YORI_DB_CHECK_DIRECT === "1";
const useTransactionalAdapter =
  process.env.YORI_DB_CHECK_TRANSACTIONAL === "1";
const databaseUrl = useDirectConnection
  ? process.env.DIRECT_URL
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to check the database.");
}

const prisma = new PrismaClient({
  adapter: useTransactionalAdapter
    ? createPostgresAdapter(databaseUrl)
    : createNeonHttpAdapter(databaseUrl),
});

function sanitize(message: string) {
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/giu, "[DATABASE_URL]")
    .replace(/[a-z0-9._-]+\.neon\.tech/giu, "[NEON_HOST]");
}

function describeError(error: unknown) {
  const errorWithCode = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    cause?: unknown;
    sourceError?: unknown;
  };
  const cause = errorWithCode.cause;
  const sourceError = errorWithCode.sourceError;

  return {
    name:
      typeof errorWithCode?.name === "string"
        ? errorWithCode.name
        : "UnknownError",
    code: typeof errorWithCode.code === "string" ? errorWithCode.code : undefined,
    message:
      typeof errorWithCode.message === "string"
        ? sanitize(errorWithCode.message)
        : undefined,
    cause:
      cause instanceof Error
        ? { name: cause.name, message: sanitize(cause.message) }
        : undefined,
    sourceError:
      sourceError instanceof Error
        ? {
            name: sourceError.name,
            message: sanitize(sourceError.message),
            cause:
              sourceError.cause instanceof Error
                ? {
                    name: sourceError.cause.name,
                    message: sanitize(sourceError.cause.message),
                  }
                : undefined,
          }
        : undefined,
  };
}

async function checkDatabase() {
  const [categoryCount, productCount, settingsCount, migrationRows] =
    await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
      prisma.siteSettings.count(),
      prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at ASC
      `,
    ]);
  const transactionProductCount = useTransactionalAdapter
    ? await prisma.$transaction((transaction) => transaction.product.count())
    : undefined;

  console.info({
    connectionMode: useDirectConnection ? "direct" : "pooled",
    adapterMode: useTransactionalAdapter ? "transactional" : "http",
    categoryCount,
    productCount,
    transactionProductCount,
    settingsCount,
    appliedMigrations: migrationRows.map(({ migration_name }) => migration_name),
  });
}

checkDatabase()
  .catch((error: unknown) => {
    console.error(describeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

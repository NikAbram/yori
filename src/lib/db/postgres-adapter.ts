import { PrismaPg } from "@prisma/adapter-pg";

export function createPostgresAdapter(connectionString: string) {
  const connectionUrl = new URL(connectionString);
  if (connectionUrl.searchParams.get("sslmode") === "require") {
    connectionUrl.searchParams.set("sslmode", "verify-full");
  }

  return new PrismaPg({
    connectionString: connectionUrl.toString(),
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    max: 2,
  });
}

import { PrismaPg } from "@prisma/adapter-pg";

export function createPostgresAdapter(connectionString: string) {
  const url = new URL(connectionString);

  return new PrismaPg({
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
}

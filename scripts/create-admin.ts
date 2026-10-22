import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { adminBootstrapSchema } from "../src/lib/admin-bootstrap-schema";
import { createPostgresAdapter } from "../src/lib/db/postgres-adapter";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DIRECT_URL or DATABASE_URL is required.");

const input = adminBootstrapSchema.safeParse({
  email: process.env.ADMIN_INITIAL_EMAIL,
  password: process.env.ADMIN_INITIAL_PASSWORD,
  name: process.env.ADMIN_INITIAL_NAME,
});

if (!input.success) {
  throw new Error(
    "ADMIN_INITIAL_EMAIL and a 12-128 character ADMIN_INITIAL_PASSWORD are required.",
  );
}

const bootstrap = input.data;

const prisma = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl) });

async function createInitialAdmin() {
  const password = await hashPassword(bootstrap.password);

  const admin = await prisma.$transaction(async (transaction) => {
    const user = await transaction.adminUser.upsert({
      where: { email: bootstrap.email },
      create: {
        email: bootstrap.email,
        name: bootstrap.name,
        emailVerified: true,
        role: "OWNER",
        isActive: true,
      },
      update: {
        name: bootstrap.name,
        emailVerified: true,
        role: "OWNER",
        isActive: true,
      },
      select: { id: true, email: true },
    });

    await transaction.adminAccount.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: user.id,
        },
      },
      create: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
      },
      update: { password },
    });

    await transaction.adminSession.deleteMany({ where: { userId: user.id } });
    return user;
  });

  console.info(`Administrator is ready: ${admin.email}. Existing sessions were revoked.`);
}

createInitialAdmin()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Administrator creation failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

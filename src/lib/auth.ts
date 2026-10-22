import "server-only";

import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";

import { prisma } from "@/lib/db/prisma";

const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const buildOnlySecret = "yori-build-only-auth-secret-not-for-runtime";
const buildOnlyBaseUrl = "http://build.invalid";

function requireAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (isProductionBuild) return buildOnlySecret;
  if (!isProduction) return "yori-development-auth-secret-change-me";
  throw new Error("AUTH_SECRET is required for administrative authentication.");
}

function getAuthBaseUrl() {
  const configuredUrl = process.env.AUTH_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;
  if (isProductionBuild) return buildOnlyBaseUrl;
  if (!isProduction) return "http://localhost:3000";
  throw new Error("AUTH_BASE_URL or NEXT_PUBLIC_APP_URL is required for administrative authentication.");
}

const authBaseUrl = getAuthBaseUrl();

export const auth = betterAuth({
  appName: "YŌRI CRM",
  baseURL: authBaseUrl,
  basePath: "/api/admin/auth",
  secret: requireAuthSecret(),
  trustedOrigins: [authBaseUrl],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  user: {
    modelName: "AdminUser",
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "MANAGER", input: false },
      isActive: { type: "boolean", required: true, defaultValue: true, input: false },
      lastLoginAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    modelName: "AdminSession",
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  account: { modelName: "AdminAccount" },
  verification: { modelName: "AdminVerification" },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "AdminAuthRateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const admin = await prisma.adminUser.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          return admin?.isActive ? undefined : false;
        },
        after: async (session) => {
          await prisma.adminUser.update({
            where: { id: session.userId },
            data: { lastLoginAt: new Date() },
          });
        },
      },
    },
  },
  advanced: {
    cookiePrefix: "yori-admin",
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    },
    database: { generateId: "uuid" },
  },
});

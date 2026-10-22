-- Extend the existing administrator model for Better Auth.
ALTER TABLE "AdminUser"
ADD COLUMN "name" VARCHAR(160),
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "image" VARCHAR(500);

UPDATE "AdminUser"
SET "name" = "email"
WHERE "name" IS NULL;

ALTER TABLE "AdminUser"
ALTER COLUMN "name" SET NOT NULL,
DROP COLUMN "passwordHash";

CREATE INDEX "AdminUser_isActive_role_idx" ON "AdminUser"("isActive", "role");

CREATE TABLE "AdminSession" (
    "id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

CREATE TABLE "AdminAccount" (
    "id" UUID NOT NULL,
    "accountId" VARCHAR(255) NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAccount_userId_idx" ON "AdminAccount"("userId");
CREATE UNIQUE INDEX "AdminAccount_providerId_accountId_key" ON "AdminAccount"("providerId", "accountId");

CREATE TABLE "AdminVerification" (
    "id" UUID NOT NULL,
    "identifier" VARCHAR(320) NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminVerification_identifier_idx" ON "AdminVerification"("identifier");

CREATE TABLE "AdminAuthRateLimit" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,
    CONSTRAINT "AdminAuthRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminAuthRateLimit_key_key" ON "AdminAuthRateLimit"("key");

ALTER TABLE "AdminSession"
ADD CONSTRAINT "AdminSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminAccount"
ADD CONSTRAINT "AdminAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

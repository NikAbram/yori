-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'COOKING', 'COURIER', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'CARD_ON_DELIVERY');

-- CreateEnum
CREATE TYPE "StatusActorType" AS ENUM ('SYSTEM', 'TELEGRAM_USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('CUSTOMER', 'MANAGER');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramUser" (
    "id" UUID NOT NULL,
    "telegramId" VARCHAR(32) NOT NULL,
    "firstName" VARCHAR(128) NOT NULL,
    "lastName" VARCHAR(128),
    "username" VARCHAR(64),
    "languageCode" VARCHAR(16),
    "phone" VARCHAR(32),
    "allowPrivateTest" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "city" VARCHAR(128) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "house" VARCHAR(32) NOT NULL,
    "apartment" VARCHAR(32),
    "entrance" VARCHAR(32),
    "floor" VARCHAR(16),
    "comment" VARCHAR(500),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "shortName" VARCHAR(64) NOT NULL,
    "eyebrow" VARCHAR(128),
    "slug" VARCHAR(96) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "ingredients" TEXT[],
    "allergens" TEXT[],
    "imagePath" VARCHAR(255) NOT NULL,
    "imageAlt" VARCHAR(255) NOT NULL,
    "weightGrams" INTEGER,
    "volumeMl" INTEGER,
    "piecesCount" INTEGER,
    "priceKopeks" INTEGER NOT NULL,
    "badge" VARCHAR(64),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "orderNo" VARCHAR(32) NOT NULL,
    "userId" UUID NOT NULL,
    "recipientName" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "city" VARCHAR(128) NOT NULL,
    "street" VARCHAR(160) NOT NULL,
    "house" VARCHAR(32) NOT NULL,
    "apartment" VARCHAR(32),
    "entrance" VARCHAR(32),
    "floor" VARCHAR(16),
    "customerNote" VARCHAR(1000),
    "subtotalKopeks" INTEGER NOT NULL,
    "deliveryKopeks" INTEGER NOT NULL,
    "discountKopeks" INTEGER NOT NULL DEFAULT 0,
    "totalKopeks" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "productNameSnapshot" VARCHAR(160) NOT NULL,
    "unitPriceKopeks" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalKopeks" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorType" "StatusActorType" NOT NULL,
    "adminUserId" UUID,
    "telegramUserId" UUID,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedTelegramUpdate" (
    "updateId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedTelegramUpdate_pkey" PRIMARY KEY ("updateId")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "orderId" UUID,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "telegramChatId" VARCHAR(32) NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorText" VARCHAR(500),
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'default',
    "isOrderingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryKopeks" INTEGER NOT NULL DEFAULT 19900,
    "freeDeliveryFromKopeks" INTEGER DEFAULT 180000,
    "minimumOrderKopeks" INTEGER NOT NULL DEFAULT 70000,
    "contactText" TEXT,
    "deliveryTerms" TEXT,
    "privacyText" TEXT,
    "operatorName" VARCHAR(160),
    "commercialHostingConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "liveReadyAt" TIMESTAMP(3),
    "updatedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "subjectHash" VARCHAR(128) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUser_telegramId_key" ON "TelegramUser"("telegramId");

-- CreateIndex
CREATE INDEX "TelegramUser_allowPrivateTest_isBlocked_idx" ON "TelegramUser"("allowPrivateTest", "isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_tokenHash_key" ON "TelegramSession"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramSession_userId_expiresAt_idx" ON "TelegramSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "TelegramSession_expiresAt_idx" ON "TelegramSession"("expiresAt");

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isPublished_sortOrder_idx" ON "Category"("isPublished", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_sortOrder_idx" ON "Product"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_isPublished_isAvailable_sortOrder_idx" ON "Product"("isPublished", "isAvailable", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_isFeatured_isPublished_sortOrder_idx" ON "Product"("isFeatured", "isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_isRecommended_isPublished_sortOrder_idx" ON "Product"("isRecommended", "isPublished", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_isTest_createdAt_idx" ON "Order"("isTest", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_adminUserId_createdAt_idx" ON "OrderStatusHistory"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_telegramUserId_createdAt_idx" ON "OrderStatusHistory"("telegramUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessedTelegramUpdate_createdAt_idx" ON "ProcessedTelegramUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_orderId_createdAt_idx" ON "NotificationLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_action_subjectHash_windowStart_key" ON "RateLimitBucket"("action", "subjectHash", "windowStart");

-- AddForeignKey
ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "TelegramUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_telegramUserId_fkey" FOREIGN KEY ("telegramUserId") REFERENCES "TelegramUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

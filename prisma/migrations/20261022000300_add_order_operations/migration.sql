-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ORDER_STATUS_CHANGED', 'ORDER_NOTE_ADDED', 'NOTIFICATION_RETRY_REQUESTED');

-- CreateTable
CREATE TABLE "OrderInternalNote" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "orderId" UUID,
    "action" "AdminAuditAction" NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderInternalNote_orderId_createdAt_idx" ON "OrderInternalNote"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderInternalNote_adminUserId_createdAt_idx" ON "OrderInternalNote"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_orderId_createdAt_idx" ON "AdminAuditLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderInternalNote" ADD CONSTRAINT "OrderInternalNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInternalNote" ADD CONSTRAINT "OrderInternalNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

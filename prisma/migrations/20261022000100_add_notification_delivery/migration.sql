-- Preserve any pre-existing journal rows before making the delivery key required.
ALTER TABLE "NotificationLog"
ADD COLUMN "deduplicationKey" VARCHAR(160);

UPDATE "NotificationLog"
SET "deduplicationKey" = 'legacy:' || "id"::text
WHERE "deduplicationKey" IS NULL;

ALTER TABLE "NotificationLog"
ALTER COLUMN "deduplicationKey" SET NOT NULL,
ALTER COLUMN "telegramChatId" DROP NOT NULL;

CREATE UNIQUE INDEX "NotificationLog_deduplicationKey_key"
ON "NotificationLog"("deduplicationKey");

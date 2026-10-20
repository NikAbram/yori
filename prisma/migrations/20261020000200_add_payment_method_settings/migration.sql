ALTER TABLE "SiteSettings"
ADD COLUMN "cashOnDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cardOnDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false;

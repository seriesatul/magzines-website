ALTER TABLE "PhotoUpload"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'CONTENT',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PhotoUpload_orderId_purpose_idx" ON "PhotoUpload"("orderId", "purpose");

-- Add configurable retention for completed orders.
ALTER TABLE "Setting"
ADD COLUMN IF NOT EXISTS "completedOrderRetentionDays" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS "retentionDeleteAfter" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_retentionDeleteAfter_idx"
ON "Order"("retentionDeleteAfter");

-- Sanitized audit ledger for orders purged from the active order tables.
CREATE TABLE IF NOT EXISTS "OrderDeletionLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT,
  "orderNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "status" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "retentionDeleteAfter" TIMESTAMP(3),
  "photoCount" INTEGER NOT NULL DEFAULT 0,
  "photoBytes" INTEGER NOT NULL DEFAULT 0,
  "deletedPhotoCount" INTEGER NOT NULL DEFAULT 0,
  "failedObjectKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "orderSnapshot" JSONB NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderDeletionLog_orderNumber_key"
ON "OrderDeletionLog"("orderNumber");

CREATE INDEX IF NOT EXISTS "OrderDeletionLog_deletedAt_idx"
ON "OrderDeletionLog"("deletedAt");

CREATE INDEX IF NOT EXISTS "OrderDeletionLog_customerPhone_idx"
ON "OrderDeletionLog"("customerPhone");
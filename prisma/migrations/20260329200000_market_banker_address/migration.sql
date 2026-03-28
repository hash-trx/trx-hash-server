ALTER TABLE "market_banker" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "market_banker" ADD COLUMN "description" TEXT;

UPDATE "market_banker" SET "address" = 'TN3W4H6rK2ce4vX9QwFQ8EPqja9qWqK7qK' WHERE "id" = 1;
UPDATE "market_banker" SET "address" = 'TJYeasGjN15xmCXM4Z9u6dJ4r8K3vR8K2m' WHERE "id" = 2;

ALTER TABLE "market_banker" ALTER COLUMN "address" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StrategyMarket"
ADD COLUMN     "description" TEXT,
ADD COLUMN     "entry" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN     "notes" JSONB NOT NULL DEFAULT '[]'::jsonb;


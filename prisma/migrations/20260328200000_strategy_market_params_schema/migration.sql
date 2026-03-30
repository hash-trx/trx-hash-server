-- AlterTable
ALTER TABLE "StrategyMarket" ADD COLUMN "paramsSchema" JSONB NOT NULL DEFAULT '[]'::jsonb;

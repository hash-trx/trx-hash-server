-- CreateTable
CREATE TABLE "StakingPreset" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paramsSchema" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StakingPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StakingPreset_enabled_idx" ON "StakingPreset"("enabled");


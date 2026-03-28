-- CreateTable
CREATE TABLE "block_hash_log" (
    "id" SERIAL NOT NULL,
    "height" INTEGER NOT NULL,
    "block_id" TEXT NOT NULL,
    "digit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_hash_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "block_hash_log_height_key" ON "block_hash_log"("height");

-- CreateIndex
CREATE INDEX "block_hash_log_height_idx" ON "block_hash_log"("height");

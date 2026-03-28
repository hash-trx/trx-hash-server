-- CreateTable
CREATE TABLE "StrategyMarket" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "scriptUrl" TEXT NOT NULL,
    "isHot" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StrategyMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_purchase" (
    "txid" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "strategy_id" INTEGER NOT NULL,
    "amount_trx" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_purchase_pkey" PRIMARY KEY ("txid")
);

-- CreateIndex
CREATE INDEX "strategy_purchase_user_id_strategy_id_idx" ON "strategy_purchase"("user_id", "strategy_id");

-- CreateTable
CREATE TABLE "strategy_usage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "strategy_id" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "strategy_usage_user_id_strategy_id_key" ON "strategy_usage"("user_id", "strategy_id");

-- CreateTable
CREATE TABLE "activation_log" (
    "txid" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_log_pkey" PRIMARY KEY ("txid")
);

CREATE TABLE "market_banker" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "rebate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "market_banker_pkey" PRIMARY KEY ("id")
);

INSERT INTO "market_banker" ("name", "odds", "rebate", "sort_order", "note") VALUES
('主盘', 1.95, 0.50, 1, '示例数据，可在库中维护'),
('快速盘', 1.92, 0.30, 2, '示例数据');

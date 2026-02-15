-- CreateTable
CREATE TABLE "ReceiptScanUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptScanUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptScanUsage_userId_idx" ON "ReceiptScanUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptScanUsage_userId_dayKey_key" ON "ReceiptScanUsage"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "ChatUsage_userId_idx" ON "ChatUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatUsage_userId_dayKey_key" ON "ChatUsage"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "ReceiptScanUsage" ADD CONSTRAINT "ReceiptScanUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUsage" ADD CONSTRAINT "ChatUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

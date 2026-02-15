import { prisma } from "../lib/prisma.js";
import { getJakartaDayKey } from "../utils/date.js";

export interface ReceiptQuotaResult {
  ok: boolean;
  used: number;
  remaining: number;
  limit: number;
}

export async function getReceiptQuota(userId: string, limit = 3): Promise<ReceiptQuotaResult> {
  const dayKey = getJakartaDayKey();
  if (!dayKey) {
    return { ok: false, used: 0, remaining: 0, limit };
  }

  const existing = await prisma.receiptScanUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });

  const used = existing?.count ?? 0;
  return {
    ok: used < limit,
    used,
    remaining: Math.max(limit - used, 0),
    limit,
  };
}

export async function consumeReceiptQuota(userId: string, limit = 3): Promise<ReceiptQuotaResult> {
  const dayKey = getJakartaDayKey();
  if (!dayKey) {
    return { ok: false, used: 0, remaining: 0, limit };
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.receiptScanUsage.findUnique({
      where: { userId_dayKey: { userId, dayKey } },
    });

    if (existing && existing.count >= limit) {
      return {
        ok: false,
        used: existing.count,
        remaining: 0,
        limit,
      };
    }

    const nextCount = (existing?.count ?? 0) + 1;

    const record = await tx.receiptScanUsage.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      update: { count: nextCount },
      create: { userId, dayKey, count: nextCount },
    });

    return {
      ok: true,
      used: record.count,
      remaining: Math.max(limit - record.count, 0),
      limit,
    };
  });
}

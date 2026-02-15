import { prisma } from "../lib/prisma.js";
import { getJakartaDayKey } from "../utils/date.js";

export interface ChatQuotaResult {
  ok: boolean;
  used: number;
  remaining: number;
  limit: number;
}

export async function consumeChatQuota(userId: string, limit = 100): Promise<ChatQuotaResult> {
  const dayKey = getJakartaDayKey();
  if (!dayKey) {
    return { ok: false, used: 0, remaining: 0, limit };
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.chatUsage.findUnique({
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

    const record = await tx.chatUsage.upsert({
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

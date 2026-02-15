import * as crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";


function generateToken() {
  return crypto.randomBytes(16).toString("base64url");
}

export async function getTelegramLinkToken(authUserId: string) {
  return prisma.linkToken.findFirst({
    where: { authUserId, platform: "telegram" },
  });
}

export async function createTelegramLinkToken(authUserId: string) {
  const existing = await getTelegramLinkToken(authUserId);

  if (existing) {
    return existing;
  }

  const token = generateToken();

  const record = await prisma.linkToken.create({
    data: {
      authUserId,
      token,
      platform: "telegram",
    },
  });

  return record;
}

export async function validateTelegramLinkToken(token: string, telegramId?: bigint) {
  const record = await prisma.linkToken.findUnique({
    where: { token },
  });

  if (!record) {
    return { ok: false, reason: "NOT_FOUND" } as const;
  }

  if (record.platform !== "telegram") {
    return { ok: false, reason: "NOT_FOUND" } as const;
  }

  if (telegramId && record.usedTelegramId && record.usedTelegramId !== telegramId) {
    return { ok: false, reason: "TOKEN_LINKED_TO_OTHER" } as const;
  }

  return { ok: true, record } as const;
}

export async function markTelegramLinkTokenUsed(linkTokenId: string, telegramId: bigint) {
  await prisma.linkToken.update({
    where: { id: linkTokenId },
    data: {
      usedAt: new Date(),
      usedTelegramId: telegramId,
    },
  });
}

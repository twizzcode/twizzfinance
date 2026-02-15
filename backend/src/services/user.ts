import { prisma } from "../lib/prisma.js";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "../types/index.js";
import { Prisma } from "../../generated/prisma/index.js";

export interface CreateUserParams {
  telegramId?: bigint;
  whatsappId?: string;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
}

function splitFullName(fullName?: string | null) {
  if (!fullName?.trim()) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

async function ensureDefaultAccounts(userId: string) {
  const existingAccounts = await prisma.account.findMany({
    where: { userId },
    select: { name: true },
  });

  const existingNames = new Set(existingAccounts.map((acc) => acc.name.toLowerCase()));
  const missing = DEFAULT_ACCOUNTS.filter((acc) => !existingNames.has(acc.name.toLowerCase()));

  if (missing.length === 0) {
    return;
  }

  await prisma.account.createMany({
    data: missing.map((acc) => ({
      userId,
      name: acc.name,
      type: acc.type,
      icon: acc.icon,
      isDefault: acc.isDefault,
      balance: new Prisma.Decimal(0),
    })),
    skipDuplicates: true,
  });
}

async function ensureDefaultCategories(userId: string) {
  const existing = await prisma.category.findMany({
    where: { userId },
    select: { name: true, type: true },
  });

  const existingSet = new Set(existing.map((cat) => `${cat.type}:${cat.name.toLowerCase()}`));
  const missing = DEFAULT_CATEGORIES.filter(
    (cat) => !existingSet.has(`${cat.type}:${cat.name.toLowerCase()}`)
  );

  if (missing.length === 0) {
    return;
  }

  await prisma.category.createMany({
    data: missing.map((cat) => ({
      userId,
      name: cat.name,
      nameId: cat.nameId,
      icon: cat.icon,
      type: cat.type,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}

/**
 * Find or create user by platform ID
 */
export async function findOrCreateUser(params: CreateUserParams) {
  const { telegramId, whatsappId, firstName, lastName, telegramUsername } = params;

  // Try to find existing user
  let user = null;
  if (telegramId) {
    user = await prisma.user.findUnique({
      where: { telegramId },
      include: { accounts: true, categories: true },
    });
  } else if (whatsappId) {
    user = await prisma.user.findUnique({
      where: { whatsappId },
      include: { accounts: true, categories: true },
    });
  }

  if (user) {
    // Update user info if changed
    if (firstName !== user.firstName || lastName !== user.lastName || telegramUsername !== user.telegramUsername) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, telegramUsername },
        include: { accounts: true, categories: true },
      });
    }

    await ensureDefaultCategories(user.id);
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { accounts: true, categories: true },
    });

    return user;
  }

  // Create new user with default accounts and categories
  return await prisma.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        telegramId,
        whatsappId,
        firstName,
        lastName,
        telegramUsername,
      },
    });

    // Create default accounts
    await tx.account.createMany({
      data: DEFAULT_ACCOUNTS.map((acc) => ({
        userId: newUser.id,
        name: acc.name,
        type: acc.type,
        icon: acc.icon,
        isDefault: acc.isDefault,
        balance: new Prisma.Decimal(0),
      })),
    });

    // Create default categories
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId: newUser.id,
        name: cat.name,
        nameId: cat.nameId,
        icon: cat.icon,
        type: cat.type,
        isSystem: true,
      })),
    });

    // Return user with relations
    return await tx.user.findUnique({
      where: { id: newUser.id },
      include: { accounts: true, categories: true },
    });
  });
}

export async function findOrCreateUserByAuth(authUserId: string, fullName?: string | null) {
  const { firstName, lastName } = splitFullName(fullName);

  let user = await prisma.user.findFirst({
    where: { authUserId },
    include: { accounts: true, categories: true },
  });

  if (!user) {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          authUserId,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
        },
      });

      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((acc) => ({
          userId: created.id,
          name: acc.name,
          type: acc.type,
          icon: acc.icon,
          isDefault: acc.isDefault,
          balance: new Prisma.Decimal(0),
        })),
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          userId: created.id,
          name: cat.name,
          nameId: cat.nameId,
          icon: cat.icon,
          type: cat.type,
          isSystem: true,
        })),
      });

      return tx.user.findUnique({
        where: { id: created.id },
        include: { accounts: true, categories: true },
      });
    });
  } else {
    const needNameUpdate =
      Boolean(firstName) &&
      !user.firstName &&
      !user.lastName;

    if (needNameUpdate) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
        },
        include: { accounts: true, categories: true },
      });
    }

    await Promise.all([
      ensureDefaultAccounts(user.id),
      ensureDefaultCategories(user.id),
    ]);

    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { accounts: true, categories: true },
    });
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true, categories: true },
  });
}

/**
 * Get user by Telegram ID
 */
export async function getUserByTelegramId(telegramId: bigint) {
  return await prisma.user.findUnique({
    where: { telegramId },
    include: { accounts: true, categories: true },
  });
}

export async function getLinkedUserByTelegramId(telegramId: bigint) {
  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { accounts: true, categories: true },
  });

  if (!user || !user.authUserId) {
    return null;
  }

  await ensureDefaultCategories(user.id);
  user = await prisma.user.findUnique({
    where: { id: user.id },
    include: { accounts: true, categories: true },
  });

  return user;
}

export async function getPreferredDisplayNameByTelegramId(telegramId: bigint) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { authUser: true },
  });

  if (!user) return null;

  const authName = user.authUser?.name?.trim();
  if (authName) {
    return authName;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  return null;
}

/**
 * Get default account for user
 */
export async function getDefaultAccount(userId: string) {
  return await prisma.account.findFirst({
    where: { userId, isDefault: true },
  });
}

export async function getOrCreatePrimaryAccount(userId: string) {
  let account = await prisma.account.findFirst({
    where: { userId, isDefault: true, isActive: true },
  });

  if (!account) {
    account = await prisma.account.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (account) {
    if (!account.isDefault) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: { isDefault: true },
      });
    }
    return account;
  }

  return prisma.account.create({
    data: {
      userId,
      name: "Main",
      type: "CASH",
      icon: "💰",
      isDefault: true,
      balance: new Prisma.Decimal(0),
    },
  });
}

export async function linkAuthUserToTelegram(authUserId: string, telegramUser: { id: number; first_name?: string; last_name?: string; username?: string }) {
  const telegramId = BigInt(telegramUser.id);

  const existingByAuth = await prisma.user.findFirst({
    where: { authUserId },
  });

  if (existingByAuth && existingByAuth.telegramId && existingByAuth.telegramId !== telegramId) {
    return { ok: false, reason: "AUTH_ALREADY_LINKED" } as const;
  }

  const user = await findOrCreateUser({
    telegramId,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    telegramUsername: telegramUser.username,
  });

  if (!user) {
    return { ok: false, reason: "USER_CREATE_FAILED" } as const;
  }

  if (user.authUserId && user.authUserId !== authUserId) {
    return { ok: false, reason: "TELEGRAM_ALREADY_LINKED" } as const;
  }

  if (!user.authUserId) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { authUserId },
    });
    return { ok: true, user: updated } as const;
  }

  return { ok: true, user } as const;
}

export async function unlinkTelegramAuth(telegramId: bigint) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return { ok: false, reason: "NOT_FOUND" } as const;
  }

  if (!user.authUserId) {
    return { ok: false, reason: "NOT_LINKED" } as const;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { authUserId: null },
  });

  return { ok: true, user: updated } as const;
}

import { prisma } from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/index.js";
import type { ParsedTransaction } from "../types/index.js";
import { getOrCreatePrimaryAccount } from "./user.js";

export interface CreateTransactionParams {
  userId: string;
  accountId: string;
  categoryId?: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  description?: string;
  rawInput?: string;
  toAccountId?: string;
  date?: Date;
}

/**
 * Create a new transaction and update account balance
 */
export async function createTransaction(params: CreateTransactionParams) {
  const { userId, accountId, categoryId, type, amount, description, rawInput, toAccountId, date } = params;

  return await prisma.$transaction(async (tx) => {
    // Create transaction
    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId,
        categoryId,
        type,
        amount: new Prisma.Decimal(amount),
        description,
        rawInput,
        toAccountId,
        ...(date ? { date } : {}),
      },
      include: {
        account: true,
        category: true,
      },
    });

    // Update account balance
    if (type === "EXPENSE") {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: new Prisma.Decimal(amount),
          },
        },
      });
    } else if (type === "INCOME") {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: new Prisma.Decimal(amount),
          },
        },
      });
    } else if (type === "TRANSFER" && toAccountId) {
      // Decrease source account
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: new Prisma.Decimal(amount),
          },
        },
      });
      // Increase destination account
      await tx.account.update({
        where: { id: toAccountId },
        data: {
          balance: {
            increment: new Prisma.Decimal(amount),
          },
        },
      });
    }

    // Get updated account balance
    const updatedAccount = await tx.account.findUnique({
      where: { id: accountId },
    });

    return { transaction, updatedBalance: updatedAccount?.balance };
  });
}

/**
 * Process parsed transaction from AI
 */
export async function processAITransaction(userId: string, parsed: ParsedTransaction, rawInput: string) {
  // Always use one unified account
  const account = await getOrCreatePrimaryAccount(userId);

  // Find category (supports English name and Indonesian display name)
  const category = await prisma.category.findFirst({
    where: {
      userId,
      type: parsed.type.toUpperCase() as "EXPENSE" | "INCOME",
      OR: [
        {
          name: {
            equals: parsed.category,
            mode: "insensitive",
          },
        },
        {
          nameId: {
            equals: parsed.category,
            mode: "insensitive",
          },
        },
      ],
    },
  }) ?? await prisma.category.findFirst({
    where: {
      userId,
      name: parsed.type === "expense" ? "Shopping" : "Other Income",
    },
  });

  // Create transaction
  return await createTransaction({
    userId,
    accountId: account.id,
    categoryId: category?.id,
    type: parsed.type.toUpperCase() as "EXPENSE" | "INCOME",
    amount: parsed.amount,
    description: parsed.description,
    rawInput,
  });
}

/**
 * Get user's total balance across all accounts
 */
export async function getTotalBalance(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
  });

  const total = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  return { accounts, total };
}

/**
 * Get recent transactions for user
 */
export async function getRecentTransactions(userId: string, limit = 10) {
  return await prisma.transaction.findMany({
    where: { userId },
    include: {
      account: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function getMonthRangeJakarta(year: number, month: number) {
  // month: 1-12, timezone Asia/Jakarta (UTC+7)
  const startUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - (7 * 60 * 60 * 1000));
  const endUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - (7 * 60 * 60 * 1000));
  return { startUtc, endUtc };
}

export async function getRecentTransactionsForMonth(
  userId: string,
  year: number,
  month: number,
  limit = 10
) {
  const { startUtc, endUtc } = getMonthRangeJakarta(year, month);
  return prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startUtc,
        lt: endUtc,
      },
    },
    include: {
      account: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function getTodayRangeJakarta() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  // Asia/Jakarta uses UTC+7 with no DST.
  const startOfDayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (7 * 60 * 60 * 1000));
  const endOfDayUtc = new Date(startOfDayUtc.getTime() + (24 * 60 * 60 * 1000));

  return { startOfDayUtc, endOfDayUtc };
}

function getCurrentWeekRangeJakarta() {
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });

  const parts = dayFormatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const weekday = weekdayFormatter.format(new Date());
  const weekdayIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }[weekday] ?? 0;

  const startOfTodayUtc = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) - (7 * 60 * 60 * 1000)
  );
  const startOfWeekUtc = new Date(
    startOfTodayUtc.getTime() - (weekdayIndex * 24 * 60 * 60 * 1000)
  );
  const endOfWeekUtc = new Date(startOfWeekUtc.getTime() + (7 * 24 * 60 * 60 * 1000));

  return { startOfWeekUtc, endOfWeekUtc };
}

export async function getCurrentWeekCashflow(userId: string) {
  const { startOfWeekUtc, endOfWeekUtc } = getCurrentWeekRangeJakarta();
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const labelFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfWeekUtc,
        lt: endOfWeekUtc,
      },
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
  });

  const grouped = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    const dayKey = dayKeyFormatter.format(tx.date);
    const bucket = grouped.get(dayKey) ?? { income: 0, expense: 0 };
    if (tx.type === "INCOME") bucket.income += Number(tx.amount);
    if (tx.type === "EXPENSE") bucket.expense += Number(tx.amount);
    grouped.set(dayKey, bucket);
  }

  const rows = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startOfWeekUtc.getTime() + (index * 24 * 60 * 60 * 1000));
    const dayKey = dayKeyFormatter.format(date);
    const existing = grouped.get(dayKey) ?? { income: 0, expense: 0 };
    const dayLabel = labelFormatter.format(date).replace(".", "");
    return {
      dayKey,
      dayLabel,
      income: existing.income,
      expense: existing.expense,
    };
  });

  return rows;
}

/**
 * Get today's transactions (Asia/Jakarta)
 */
export async function getTodayTransactions(userId: string) {
  const { startOfDayUtc, endOfDayUtc } = getTodayRangeJakarta();

  return prisma.transaction.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfDayUtc,
        lt: endOfDayUtc,
      },
    },
    include: {
      account: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get transaction summary for today (Asia/Jakarta)
 */
export async function getTodaySummary(userId: string) {
  const { startOfDayUtc, endOfDayUtc } = getTodayRangeJakarta();

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfDayUtc,
        lt: endOfDayUtc,
      },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const summary = {
    totalExpense: 0,
    totalIncome: 0,
  };

  for (const t of transactions) {
    if (t.type === "EXPENSE") {
      summary.totalExpense += Number(t.amount);
    } else if (t.type === "INCOME") {
      summary.totalIncome += Number(t.amount);
    }
  }

  return summary;
}

/**
 * Get transaction summary for current month
 */
export async function getMonthSummary(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfMonth },
    },
  });

  const summary = {
    totalExpense: 0,
    totalIncome: 0,
    transactionCount: transactions.length,
  };

  for (const t of transactions) {
    if (t.type === "EXPENSE") {
      summary.totalExpense += Number(t.amount);
    } else if (t.type === "INCOME") {
      summary.totalIncome += Number(t.amount);
    }
  }

  return summary;
}

export async function getMonthSummaryForPeriod(userId: string, year: number, month: number) {
  const { startUtc, endUtc } = getMonthRangeJakarta(year, month);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startUtc,
        lt: endUtc,
      },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const summary = {
    totalExpense: 0,
    totalIncome: 0,
    transactionCount: transactions.length,
  };

  for (const t of transactions) {
    if (t.type === "EXPENSE") {
      summary.totalExpense += Number(t.amount);
    } else if (t.type === "INCOME") {
      summary.totalIncome += Number(t.amount);
    }
  }

  return summary;
}

export async function getExpenseCategorySummaryForPeriod(userId: string, year: number, month: number) {
  const { startUtc, endUtc } = getMonthRangeJakarta(year, month);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: {
        gte: startUtc,
        lt: endUtc,
      },
    },
    select: {
      amount: true,
      category: {
        select: {
          name: true,
          nameId: true,
        },
      },
    },
  });

  const grouped = new Map<string, number>();
  for (const tx of transactions) {
    const label = tx.category?.nameId || tx.category?.name || "Lainnya";
    grouped.set(label, (grouped.get(label) ?? 0) + Number(tx.amount));
  }

  return Array.from(grouped.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Delete last transaction for user
 */
export async function deleteLastTransaction(userId: string) {
  const lastTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!lastTransaction) return null;

  return await prisma.$transaction(async (tx) => {
    // Reverse balance change
    if (lastTransaction.type === "EXPENSE") {
      await tx.account.update({
        where: { id: lastTransaction.accountId },
        data: {
          balance: {
            increment: lastTransaction.amount,
          },
        },
      });
    } else if (lastTransaction.type === "INCOME") {
      await tx.account.update({
        where: { id: lastTransaction.accountId },
        data: {
          balance: {
            decrement: lastTransaction.amount,
          },
        },
      });
    } else if (lastTransaction.type === "TRANSFER" && lastTransaction.toAccountId) {
      await tx.account.update({
        where: { id: lastTransaction.accountId },
        data: {
          balance: {
            increment: lastTransaction.amount,
          },
        },
      });
      await tx.account.update({
        where: { id: lastTransaction.toAccountId },
        data: {
          balance: {
            decrement: lastTransaction.amount,
          },
        },
      });
    }

    // Delete transaction
    await tx.transaction.delete({
      where: { id: lastTransaction.id },
    });

    return lastTransaction;
  });
}

/**
 * Delete a specific transaction for user and restore account balance
 */
export async function deleteTransactionById(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });

  if (!transaction) return null;

  return await prisma.$transaction(async (tx) => {
    if (transaction.type === "EXPENSE") {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      });
    } else if (transaction.type === "INCOME") {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount,
          },
        },
      });
    } else if (transaction.type === "TRANSFER" && transaction.toAccountId) {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      });
      await tx.account.update({
        where: { id: transaction.toAccountId },
        data: {
          balance: {
            decrement: transaction.amount,
          },
        },
      });
    }

    await tx.transaction.delete({
      where: { id: transaction.id },
    });

    return transaction;
  });
}

export async function findLatestTransactionByRawInput(userId: string, rawInput: string) {
  return prisma.transaction.findFirst({
    where: {
      userId,
      rawInput,
    },
    orderBy: { createdAt: "desc" },
  });
}

function getWeekRangeJakartaByReference(referenceDate: Date) {
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });

  const parts = dayFormatter.formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const weekday = weekdayFormatter.format(referenceDate);
  const weekdayIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }[weekday] ?? 0;

  const startOfTodayUtc = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) - (7 * 60 * 60 * 1000)
  );
  const startOfWeekUtc = new Date(
    startOfTodayUtc.getTime() - (weekdayIndex * 24 * 60 * 60 * 1000)
  );
  const endOfWeekUtc = new Date(startOfWeekUtc.getTime() + (7 * 24 * 60 * 60 * 1000));

  return { startOfWeekUtc, endOfWeekUtc };
}

export async function getWeekCashflowByReference(userId: string, referenceDate: Date) {
  const { startOfWeekUtc, endOfWeekUtc } = getWeekRangeJakartaByReference(referenceDate);
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const labelFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });
  const dayNumberFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
  });
  const todayDayKey = dayKeyFormatter.format(new Date());

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfWeekUtc,
        lt: endOfWeekUtc,
      },
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
  });

  const grouped = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    const dayKey = dayKeyFormatter.format(tx.date);
    const bucket = grouped.get(dayKey) ?? { income: 0, expense: 0 };
    if (tx.type === "INCOME") bucket.income += Number(tx.amount);
    if (tx.type === "EXPENSE") bucket.expense += Number(tx.amount);
    grouped.set(dayKey, bucket);
  }

  const rows = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startOfWeekUtc.getTime() + (index * 24 * 60 * 60 * 1000));
    const dayKey = dayKeyFormatter.format(date);
    const existing = grouped.get(dayKey) ?? { income: 0, expense: 0 };
    const dayLabel = labelFormatter.format(date).replace(".", "");
    return {
      dayKey,
      dayLabel,
      dayDate: dayNumberFormatter.format(date),
      isToday: dayKey === todayDayKey,
      income: existing.income,
      expense: existing.expense,
    };
  });

  return {
    rows,
    startOfWeekUtc,
    endOfWeekUtc: new Date(endOfWeekUtc.getTime() - 1),
  };
}

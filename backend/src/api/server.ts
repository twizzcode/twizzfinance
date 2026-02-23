import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { toNodeHandler } from "better-auth/node";
import { z } from "zod";
import { env } from "../config/env.js";
import { auth } from "../auth/index.js";
import { createTelegramLinkToken, getTelegramLinkToken } from "../services/link.js";
import { findOrCreateUserByAuth, getOrCreatePrimaryAccount } from "../services/user.js";
import { prisma } from "../lib/prisma.js";
import {
  createTransaction,
  getExpenseCategorySummaryForPeriod,
  getMonthSummaryForPeriod,
  getRecentTransactionsForMonth,
  getTotalBalance,
  getWeekCashflowByReference,
} from "../services/transaction.js";

interface JsonResponse {
  status: string;
  data?: unknown;
  error?: string;
}

const createTransactionBodySchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: z.coerce.number().positive().max(1_000_000_000_000),
  description: z.string().trim().min(1).max(180).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  date: z.string().trim().optional(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function getJakartaWeekdayIndex(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(date);
  return (
    {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    }[weekday] ?? 0
  );
}

function getWeeksInMonthJakarta(year: number, month: number) {
  const firstDayRef = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstWeekdayIndex = getJakartaWeekdayIndex(firstDayRef);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.ceil((firstWeekdayIndex + daysInMonth) / 7);
}

function getWeekReferenceByMonthAndIndex(year: number, month: number, week: number) {
  const firstDayRef = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstWeekdayIndex = getJakartaWeekdayIndex(firstDayRef);
  const firstWeekMondayRef = new Date(firstDayRef.getTime() - (firstWeekdayIndex * DAY_MS));
  return new Date(firstWeekMondayRef.getTime() + ((week - 1) * 7 * DAY_MS));
}

function buildEmptyWeekRows(weekReferenceDate: Date) {
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayLabelFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  });
  const dayNumberFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
  });
  const todayKey = dayKeyFormatter.format(new Date());

  const weekdayIndex = getJakartaWeekdayIndex(weekReferenceDate);
  const mondayReference = new Date(weekReferenceDate.getTime() - (weekdayIndex * DAY_MS));

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(mondayReference.getTime() + (index * DAY_MS));
    const dayKey = dayKeyFormatter.format(date);
    return {
      dayKey,
      dayLabel: dayLabelFormatter.format(date).replace(".", ""),
      dayDate: dayNumberFormatter.format(date),
      isToday: dayKey === todayKey,
      income: 0,
      expense: 0,
    };
  });
}

function setCors(res: ServerResponse, origin: string) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

function sendJson(res: ServerResponse, statusCode: number, payload: JsonResponse) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": env.FRONTEND_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  });
  res.end(JSON.stringify(payload));
}

function sendJsonWithCors(
  res: ServerResponse,
  statusCode: number,
  payload: JsonResponse,
  origin: string
) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const bodyText = Buffer.concat(chunks).toString("utf8");
  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function startApiServer() {
  const port = env.API_PORT ?? 4000;
  const authHandler = toNodeHandler(auth);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url || !req.method) {
      sendJson(res, 400, { status: "error", error: "Invalid request" });
      return;
    }

    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname.startsWith("/api/auth")) {
      setCors(res, env.FRONTEND_ORIGIN);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      await authHandler(req, res);
      return;
    }

    if (url.pathname === "/link/telegram") {
      setCors(res, env.FRONTEND_ORIGIN);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== "POST" && req.method !== "GET") {
        sendJsonWithCors(res, 405, { status: "error", error: "Method not allowed" }, env.FRONTEND_ORIGIN);
        return;
      }

      try {
        const sessionData = await auth.api.getSession({ headers: req.headers });
        const authUserId = sessionData?.user?.id;

        if (!authUserId) {
          sendJsonWithCors(res, 401, { status: "error", error: "Unauthorized" }, env.FRONTEND_ORIGIN);
          return;
        }

        const tokenRecord =
          req.method === "GET"
            ? await getTelegramLinkToken(authUserId)
            : await createTelegramLinkToken(authUserId);
        const token = tokenRecord?.token;
        const botUsername = env.TELEGRAM_BOT_USERNAME;
        const deepLink = token && botUsername
          ? `https://t.me/${botUsername}?start=link_${token}`
          : null;

        sendJsonWithCors(res, 200, {
          status: "ok",
          data: {
            token: token ?? null,
            deepLink,
            linked: Boolean(tokenRecord?.usedTelegramId),
          },
        }, env.FRONTEND_ORIGIN);
      } catch (error) {
        console.error("API /link/telegram error:", error);
        sendJsonWithCors(res, 500, { status: "error", error: "Server error" }, env.FRONTEND_ORIGIN);
      }
      return;
    }

    if (url.pathname === "/transactions") {
      setCors(res, env.FRONTEND_ORIGIN);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== "POST") {
        sendJsonWithCors(res, 405, { status: "error", error: "Method not allowed" }, env.FRONTEND_ORIGIN);
        return;
      }

      try {
        const sessionData = await auth.api.getSession({ headers: req.headers });
        const authUserId = sessionData?.user?.id;
        const authName = sessionData?.user?.name ?? null;

        if (!authUserId) {
          sendJsonWithCors(res, 401, { status: "error", error: "Unauthorized" }, env.FRONTEND_ORIGIN);
          return;
        }

        const rawBody = await readJsonBody(req);
        const parsed = createTransactionBodySchema.safeParse(rawBody);

        if (!parsed.success) {
          sendJsonWithCors(res, 400, { status: "error", error: "Invalid payload" }, env.FRONTEND_ORIGIN);
          return;
        }

        let txDate: Date | undefined;
        if (parsed.data.date) {
          const candidate = new Date(parsed.data.date);
          if (Number.isNaN(candidate.getTime())) {
            sendJsonWithCors(res, 400, { status: "error", error: "Invalid date format" }, env.FRONTEND_ORIGIN);
            return;
          }
          txDate = candidate;
        }

        const user = await findOrCreateUserByAuth(authUserId, authName);
        if (!user) {
          sendJsonWithCors(res, 404, { status: "error", error: "User not found" }, env.FRONTEND_ORIGIN);
          return;
        }

        const account = await getOrCreatePrimaryAccount(user.id);
        const category = await prisma.category.findFirst({
          where: {
            userId: user.id,
            type: parsed.data.type,
            OR: parsed.data.category
              ? [
                  { name: { equals: parsed.data.category, mode: "insensitive" } },
                  { nameId: { equals: parsed.data.category, mode: "insensitive" } },
                ]
              : undefined,
          },
          orderBy: { createdAt: "asc" },
        }) ?? await prisma.category.findFirst({
          where: {
            userId: user.id,
            type: parsed.data.type,
          },
          orderBy: { createdAt: "asc" },
        });

        const created = await createTransaction({
          userId: user.id,
          accountId: account.id,
          categoryId: category?.id,
          type: parsed.data.type,
          amount: parsed.data.amount,
          description: parsed.data.description,
          rawInput: "WEB_DASHBOARD",
          date: txDate,
        });

        sendJsonWithCors(
          res,
          201,
          {
            status: "ok",
            data: {
              id: created.transaction.id,
              type: created.transaction.type,
              amount: Number(created.transaction.amount),
              description: created.transaction.description,
              category: created.transaction.category?.nameId || created.transaction.category?.name || "Lainnya",
              date: created.transaction.date.toISOString(),
            },
          },
          env.FRONTEND_ORIGIN
        );
      } catch (error) {
        console.error("API /transactions error:", error);
        const message =
          error instanceof Error && error.message === "INVALID_JSON"
            ? "Invalid JSON"
            : "Server error";
        sendJsonWithCors(res, message === "Invalid JSON" ? 400 : 500, { status: "error", error: message }, env.FRONTEND_ORIGIN);
      }
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        data: { time: new Date().toISOString() },
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/dashboard") {
      try {
        const sessionData = await auth.api.getSession({ headers: req.headers });
        const authUserId = sessionData?.user?.id;
        const authName = sessionData?.user?.name ?? null;
        const authImage = sessionData?.user?.image ?? null;
        const authNameParts = authName ? authName.trim().split(/\s+/) : [];
        const authFirstName = authNameParts[0] ?? null;
        const authLastName = authNameParts.length > 1 ? authNameParts.slice(1).join(" ") : null;

        if (!authUserId) {
          sendJson(res, 401, { status: "error", error: "Unauthorized" });
          return;
        }

        const monthParam = url.searchParams.get("month");
        const isValidMonthParam =
          typeof monthParam === "string" &&
          /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam);

        const jakartaNowParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const currentYear = Number(jakartaNowParts.find((part) => part.type === "year")?.value);
        const currentMonth = Number(jakartaNowParts.find((part) => part.type === "month")?.value);
        const currentDay = Number(jakartaNowParts.find((part) => part.type === "day")?.value);

        const selectedYear = isValidMonthParam ? Number(monthParam.slice(0, 4)) : currentYear;
        const selectedMonth = isValidMonthParam ? Number(monthParam.slice(5, 7)) : currentMonth;
        const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
        const weeksInMonth = getWeeksInMonthJakarta(selectedYear, selectedMonth);

        const weekParamRaw = Number(url.searchParams.get("week"));
        const isValidWeekParam = Number.isInteger(weekParamRaw);
        const defaultWeek =
          selectedYear === currentYear && selectedMonth === currentMonth
            ? Math.floor((getJakartaWeekdayIndex(new Date(Date.UTC(currentYear, currentMonth - 1, 1, 12, 0, 0))) + currentDay - 1) / 7) + 1
            : 1;
        const selectedWeek = Math.min(
          weeksInMonth,
          Math.max(1, isValidWeekParam ? weekParamRaw : defaultWeek)
        );
        const weekReferenceDate = getWeekReferenceByMonthAndIndex(
          selectedYear,
          selectedMonth,
          selectedWeek
        );

        const dayFormatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const monthStartDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 12, 0, 0));
        const monthEndDate = new Date(Date.UTC(selectedYear, selectedMonth, 0, 12, 0, 0));
        const weekStartDate = new Date(
          weekReferenceDate.getTime() - (getJakartaWeekdayIndex(weekReferenceDate) * DAY_MS)
        );
        const weekEndDate = new Date(weekStartDate.getTime() + (6 * DAY_MS));

        const user = await findOrCreateUserByAuth(authUserId, authName);

        if (!user) {
          sendJson(res, 200, {
            status: "ok",
            data: {
              user: {
                id: authUserId,
                firstName: authFirstName,
                lastName: authLastName,
                image: authImage,
              },
              summary: {
                totalBalance: 0,
                totalIncome: 0,
                totalExpense: 0,
                transactionCount: 0,
              },
              accounts: [],
              recentTransactions: [],
              expenseCategories: [],
              weekCashflow: buildEmptyWeekRows(weekReferenceDate),
              period: {
                month: selectedMonthKey,
                selectedWeek,
                weeksInMonth,
                monthStart: dayFormatter.format(monthStartDate),
                monthEnd: dayFormatter.format(monthEndDate),
                weekStart: dayFormatter.format(weekStartDate),
                weekEnd: dayFormatter.format(weekEndDate),
              },
            },
          });
          return;
        }

        const [balanceData, monthSummary, recentTransactions, weekCashflow, expenseCategories] =
          await Promise.all([
            getTotalBalance(user.id),
            getMonthSummaryForPeriod(user.id, selectedYear, selectedMonth),
            getRecentTransactionsForMonth(user.id, selectedYear, selectedMonth, 8),
            getWeekCashflowByReference(user.id, weekReferenceDate),
            getExpenseCategorySummaryForPeriod(user.id, selectedYear, selectedMonth),
          ]);

        const accounts = [
          {
            id: "main",
            name: "Saldo Gabungan",
            type: "CASH",
            balance: balanceData.total,
          },
        ];

        const recent = recentTransactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount),
          description: tx.description || tx.rawInput || "Transaksi",
          account: "Saldo Gabungan",
          category: tx.category?.name ?? "Other",
          date: tx.date.toISOString(),
        }));

        sendJson(res, 200, {
          status: "ok",
          data: {
            user: {
              id: user.id,
              firstName: user.firstName ?? authFirstName,
              lastName: user.lastName ?? authLastName,
              image: authImage,
            },
            summary: {
              totalBalance: balanceData.total,
              totalIncome: monthSummary.totalIncome,
              totalExpense: monthSummary.totalExpense,
              transactionCount: monthSummary.transactionCount,
            },
            accounts,
            recentTransactions: recent,
            expenseCategories,
            weekCashflow: weekCashflow.rows,
            period: {
              month: selectedMonthKey,
              selectedWeek,
              weeksInMonth,
              monthStart: dayFormatter.format(monthStartDate),
              monthEnd: dayFormatter.format(monthEndDate),
              weekStart: dayFormatter.format(weekCashflow.startOfWeekUtc),
              weekEnd: dayFormatter.format(weekCashflow.endOfWeekUtc),
            },
          },
        });
        return;
      } catch (error) {
        console.error("API /dashboard error:", error);
        sendJson(res, 500, { status: "error", error: "Server error" });
        return;
      }
    }

    sendJson(res, 404, { status: "error", error: "Not found" });
  });

  server.listen(port, () => {
    console.log(`🌐 Web API running on http://localhost:${port}`);
  });

  return server;
}

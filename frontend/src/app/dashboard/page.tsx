import { SignOutButton } from "@/components/auth/sign-out-button";
import { WeeklyCashflowChart } from "@/components/dashboard/weekly-cashflow-chart";
import { cookies } from "next/headers";
import { WeekPeriodCard } from "@/components/dashboard/week-period-card";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, HandCoins, Wallet2 } from "lucide-react";

type DashboardData = {
  user: { id: string; firstName: string | null; lastName: string | null; image?: string | null } | null;
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    transactionCount: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    account: string;
    category: string;
    date: string;
  }>;
  weekCashflow: Array<{
    dayKey: string;
    dayLabel: string;
    dayDate: string;
    isToday: boolean;
    income: number;
    expense: number;
  }>;
  period: {
    month: string;
    selectedWeek: number;
    weeksInMonth: number;
    monthStart: string | null;
    monthEnd: string | null;
    weekStart: string | null;
    weekEnd: string | null;
  };
};

const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

async function getDashboardData(apiBase: string, month?: string, week?: number): Promise<DashboardData | null> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (typeof week === "number" && Number.isInteger(week) && week > 0) {
    params.set("week", String(week));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase}/dashboard${query}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: DashboardData };
  return payload.data ?? null;
}

function toShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function isValidMonthParam(value?: string) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getWeeksInMonth(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayIndex = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.ceil((mondayIndex + daysInMonth) / 7);
}

function buildFallbackWeekRows(monthKey: string, selectedWeek: number) {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const firstDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstMondayOffset = (firstDate.getUTCDay() + 6) % 7;
  const firstWeekMonday = new Date(firstDate.getTime() - (firstMondayOffset * 24 * 60 * 60 * 1000));
  const weekMonday = new Date(firstWeekMonday.getTime() + ((selectedWeek - 1) * 7 * 24 * 60 * 60 * 1000));

  const dayFmt = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  });
  const dayNumFmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const keyFmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const todayKey = keyFmt.format(new Date());

  return Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(weekMonday.getTime() + (i * 24 * 60 * 60 * 1000));
    const dayKey = keyFmt.format(date);
    return {
      dayKey,
      dayLabel: dayFmt.format(date).replace(".", ""),
      dayDate: dayNumFmt.format(date),
      isToday: dayKey === todayKey,
      income: 0,
      expense: 0,
    };
  });
}

type DashboardPageProps = {
  searchParams?: Promise<{ month?: string; week?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = await searchParams;
  const monthParam = isValidMonthParam(resolvedParams?.month) ? resolvedParams?.month : undefined;
  const weekParam = Number(resolvedParams?.week);
  const safeWeekParam = Number.isInteger(weekParam) && weekParam > 0 ? weekParam : undefined;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const dashboard = await getDashboardData(apiBase, monthParam, safeWeekParam);

  const nowJakarta = new Date(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  );
  const currentMonthKey = `${nowJakarta.getFullYear()}-${String(nowJakarta.getMonth() + 1).padStart(2, "0")}`;

  const summary = dashboard?.summary ?? {
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
  };
  const recentTransactions = dashboard?.recentTransactions ?? [];
  const period = dashboard?.period ?? {
    month: monthParam ?? currentMonthKey,
    selectedWeek: 1,
    weeksInMonth: getWeeksInMonth(
      Number((monthParam ?? currentMonthKey).slice(0, 4)),
      Number((monthParam ?? currentMonthKey).slice(5, 7))
    ),
    monthStart: null,
    monthEnd: null,
    weekStart: null,
    weekEnd: null,
  };
  const weekCashflowRaw = dashboard?.weekCashflow ?? buildFallbackWeekRows(period.month, period.selectedWeek);
  const weekCashflow = weekCashflowRaw.map((row) => ({
    ...row,
    dayDate: row.dayDate && row.dayDate !== "--" ? row.dayDate : row.dayKey.slice(8, 10),
  }));

  const userName = dashboard?.user
    ? [dashboard.user.firstName, dashboard.user.lastName].filter(Boolean).join(" ")
    : "Pengguna";
  const profileInitial =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const profileImage = dashboard?.user?.image ?? null;

  return (
    <div className="safe-top safe-bottom min-h-screen bg-[linear-gradient(180deg,#e9edf2_0%,#f3f5f8_54%,#eceff4_100%)] px-3 sm:px-8">
      <main className="mx-auto w-full max-w-[430px] rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 pb-24 shadow-[0_16px_44px_rgba(15,23,42,0.16)]">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {profileImage ? (
                <div
                  className="h-14 w-14 rounded-full bg-cover bg-center ring-4 ring-slate-100"
                  style={{ backgroundImage: `url("${profileImage}")` }}
                  aria-label="Foto profil"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] text-base font-semibold text-white ring-4 ring-slate-100">
                  {profileInitial}
                </div>
              )}
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <BadgeCheck className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500">Welcome back</p>
              <h1 className="text-2xl font-semibold leading-none text-slate-900">Hello, {userName}</h1>
              <p className="mt-1 text-xs text-slate-500">Kelola arus kasmu hari ini</p>
            </div>
          </div>
          <SignOutButton className="h-10 px-4 text-xs" label="Keluar" />
        </header>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-[linear-gradient(150deg,#0f172a_0%,#1e293b_100%)] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.3)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Sisa Saldo</p>
          <p className="mt-1 text-3xl font-semibold">{formatIdr(summary.totalBalance)}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
            <span>Single account mode</span>
            <span>{summary.transactionCount} transaksi</span>
          </div>
        </section>

        <div className="mt-4">
          <WeekPeriodCard
            selectedMonth={period.month}
            selectedWeek={period.selectedWeek}
            weeksInMonth={period.weeksInMonth}
          />
        </div>

        <div className="mt-4">
          <WeeklyCashflowChart data={weekCashflow} />
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#ffffff_0%,#f1f5f9_100%)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/70">
            <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-100/60 blur-xl" />
            <div className="relative flex items-start justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pemasukan</p>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">
                <HandCoins className="h-4 w-4" />
              </span>
            </div>
            <p className="relative mt-3 text-lg font-semibold text-slate-900">{formatIdr(summary.totalIncome)}</p>
            <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-700" />
              {summary.transactionCount} transaksi
            </p>
          </article>
          <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/70">
            <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-rose-100/60 blur-xl" />
            <div className="relative flex items-start justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pengeluaran</p>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200/70">
                <Wallet2 className="h-4 w-4" />
              </span>
            </div>
            <p className="relative mt-3 text-lg font-semibold text-slate-900">{formatIdr(summary.totalExpense)}</p>
            <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
              <ArrowDownLeft className="h-3.5 w-3.5 text-rose-700" />
              Rasio {summary.totalIncome > 0 ? Math.round((summary.totalExpense / summary.totalIncome) * 100) : 0}%
            </p>
          </article>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Transaksi Terbaru</h3>
            <span className="text-xs text-slate-500">Database</span>
          </div>
          <div className="mt-3 space-y-2">
            {recentTransactions.length ? (
              recentTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{tx.description}</p>
                    <p className="text-[11px] text-slate-500">
                      {tx.category} • {toShortDate(tx.date)}
                    </p>
                  </div>
                  <p className="ml-3 text-sm font-semibold text-slate-800">{formatIdr(tx.amount)}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Belum ada transaksi pada periode ini.</p>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

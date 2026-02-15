import { cookies } from "next/headers";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MonthlyPeriodCard } from "@/components/dashboard/monthly-period-card";
import { ExpenseCategoryChart } from "@/components/dashboard/expense-category-chart";

type DashboardData = {
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    transactionCount: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
  }>;
  expenseCategories: Array<{
    category: string;
    amount: number;
  }>;
  period?: {
    month: string;
  };
};

const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function toShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function isValidMonthParam(value?: string): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

async function getDashboardData(apiBase: string, month: string): Promise<DashboardData | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase}/dashboard?month=${month}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: DashboardData };
  return payload.data ?? null;
}

type TransactionPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function TransactionPage({ searchParams }: TransactionPageProps) {
  const resolvedParams = await searchParams;
  const nowJakarta = new Date(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  );
  const currentMonth = `${nowJakarta.getFullYear()}-${String(nowJakarta.getMonth() + 1).padStart(2, "0")}`;
  const monthFromQuery = resolvedParams?.month;
  const selectedMonth = isValidMonthParam(monthFromQuery) ? monthFromQuery : currentMonth;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const dashboard = await getDashboardData(apiBase, selectedMonth);
  const summary = dashboard?.summary ?? {
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
  };
  const rows = dashboard?.recentTransactions ?? [];
  const expenseCategories = dashboard?.expenseCategories ?? [];

  return (
    <div className="safe-top safe-bottom min-h-screen bg-[linear-gradient(180deg,#e9edf2_0%,#f3f5f8_54%,#eceff4_100%)] px-3 sm:px-8">
      <main className="mx-auto w-full max-w-[430px] rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 pb-24 shadow-[0_16px_44px_rgba(15,23,42,0.16)]">
        <header>
          <p className="text-xs font-medium tracking-wide text-slate-500">Riwayat</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Transaction Bulanan</h1>
        </header>

        <MonthlyPeriodCard selectedMonth={selectedMonth} />

        <section className="mt-4 grid grid-cols-2 gap-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pemasukan</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{formatIdr(summary.totalIncome)}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pengeluaran</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{formatIdr(summary.totalExpense)}</p>
          </article>
        </section>

        <ExpenseCategoryChart data={expenseCategories} />

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Daftar Transaksi</h2>
            <span className="text-xs text-slate-500">{dashboard?.period?.month ?? selectedMonth}</span>
          </div>
          <div className="space-y-2">
            {rows.length ? (
              rows.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
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
              <p className="text-xs text-slate-500">Belum ada transaksi di bulan ini.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">{summary.transactionCount} transaksi pada periode ini</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

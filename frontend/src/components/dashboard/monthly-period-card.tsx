"use client";

import { CalendarRange } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MonthlyPeriodCardProps = {
  selectedMonth: string;
};

function buildMonthOptions() {
  const base = new Date();
  const options: Array<{ value: string; label: string }> = [];

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);
    options.push({ value, label });
  }

  return options;
}

export function MonthlyPeriodCard({ selectedMonth }: MonthlyPeriodCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const monthOptions = buildMonthOptions();

  const updateMonth = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white">
          <CalendarRange className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
          <p className="text-sm font-semibold text-slate-900">Pilih bulan</p>
        </div>
      </div>
      <select
        value={selectedMonth}
        onChange={(event) => updateMonth(event.target.value)}
        className="mt-3 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700"
        aria-label="Pilih bulan"
      >
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
}

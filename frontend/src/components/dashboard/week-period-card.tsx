"use client";

import { CalendarRange } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type WeekPeriodCardProps = {
  selectedMonth: string;
  selectedWeek: number;
  weeksInMonth: number;
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

export function WeekPeriodCard({
  selectedMonth,
  selectedWeek,
  weeksInMonth,
}: WeekPeriodCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const monthOptions = buildMonthOptions();
  const weekOptions = Array.from({ length: weeksInMonth }, (_, index) => index + 1);

  const updateQuery = (patch: { month?: string; week?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.month) params.set("month", patch.month);
    if (typeof patch.week === "number") params.set("week", String(patch.week));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white">
          <CalendarRange className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
          <p className="text-sm font-semibold text-slate-900">Pilih bulan dan pekan</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={selectedMonth}
          onChange={(event) => updateQuery({ month: event.target.value, week: 1 })}
          className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
          aria-label="Pilih bulan"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={String(selectedWeek)}
          onChange={(event) => updateQuery({ week: Number(event.target.value) })}
          className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
          aria-label="Pilih pekan"
        >
          {weekOptions.map((week) => (
            <option key={week} value={week}>
              Pekan {week}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

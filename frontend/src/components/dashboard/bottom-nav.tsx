"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ScrollText, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/transaction", label: "Transaction", icon: ScrollText },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

function getJakartaCurrentMonthWeek() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const firstDayRef = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(firstDayRef);
  const mondayBasedIndex =
    {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    }[firstWeekday] ?? 0;

  const week = Math.floor((mondayBasedIndex + day - 1) / 7) + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return { monthKey, week };
}

export function BottomNav() {
  const pathname = usePathname();
  const { monthKey, week } = getJakartaCurrentMonthWeek();

  return (
    <nav className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-auto -translate-x-1/2 rounded-full border border-slate-300/80 bg-slate-900 px-2 py-2 shadow-[0_16px_34px_rgba(15,23,42,0.35)]">
      <ul className="flex items-center gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const href =
            item.href === "/dashboard"
              ? `/dashboard?month=${monthKey}&week=${week}`
              : item.href;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-label={item.label}
                className={`grid h-10 w-10 place-items-center rounded-full transition ${
                  active
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

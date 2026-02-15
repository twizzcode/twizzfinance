import { cookies } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { ChannelIntegrations } from "@/components/integration/channel-integrations";
import { BadgeCheck, UserRound } from "lucide-react";

type DashboardData = {
  user: { firstName: string | null; lastName: string | null; image?: string | null } | null;
  summary: {
    totalBalance: number;
    transactionCount: number;
  };
};

const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

async function getDashboardData(apiBase: string): Promise<DashboardData | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase}/dashboard`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: DashboardData };
  return payload.data ?? null;
}

export default async function ProfilePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
  const dashboard = await getDashboardData(apiBase);
  const name = dashboard?.user
    ? [dashboard.user.firstName, dashboard.user.lastName].filter(Boolean).join(" ")
    : "Pengguna";
  const initial =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const profileImage = dashboard?.user?.image ?? null;

  return (
    <div className="safe-top safe-bottom min-h-screen bg-[linear-gradient(180deg,#e9edf2_0%,#f3f5f8_54%,#eceff4_100%)] px-3 sm:px-8">
      <main className="mx-auto w-full max-w-[430px] rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 pb-24 shadow-[0_16px_44px_rgba(15,23,42,0.16)]">
        <header>
          <p className="text-xs font-medium tracking-wide text-slate-500">Akun</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Profile</h1>
        </header>

        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(155deg,#ffffff_0%,#f1f5f9_100%)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              {profileImage ? (
                <div
                  className="h-14 w-14 rounded-full bg-cover bg-center ring-4 ring-white"
                  style={{ backgroundImage: `url("${profileImage}")` }}
                  aria-label="Foto profil"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] text-base font-semibold text-white ring-4 ring-white">
                  {initial}
                </div>
              )}
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <BadgeCheck className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{name}</p>
              <p className="text-xs text-slate-500">User Telewa</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                <UserRound className="h-3.5 w-3.5" />
                Akun aktif
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saldo</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatIdr(dashboard?.summary.totalBalance ?? 0)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Transaksi</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{dashboard?.summary.transactionCount ?? 0}</p>
            </article>
          </div>

          <div className="mt-4">
            <SignOutButton className="h-10 w-full text-xs" label="Keluar" />
          </div>
        </section>

        <div className="mt-4">
          <ChannelIntegrations />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

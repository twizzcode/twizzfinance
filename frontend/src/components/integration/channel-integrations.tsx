"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircleMore, Send } from "lucide-react";

type LinkResponse = {
  status: string;
  data?: {
    token: string | null;
    deepLink: string | null;
    linked?: boolean;
  };
  error?: string;
};

export function ChannelIntegrations() {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [copied, setCopied] = useState<"token" | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let active = true;
    const loadToken = async () => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000";
        const response = await fetch(`${apiBase}/link/telegram`, {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json()) as LinkResponse;
        if (!active || !response.ok || payload.status !== "ok" || !payload.data) return;
        setToken(payload.data.token);
        setDeepLink(payload.data.deepLink);
        setLinked(Boolean(payload.data.linked));
        setRevealed(Boolean(payload.data.token));
      } catch {
        if (active) setError("Tidak bisa memuat kode Telegram.");
      } finally {
        if (active) setLoadingInitial(false);
      }
    };

    loadToken();
    return () => {
      active = false;
    };
  }, []);

  const handleTelegramConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000";
      const response = await fetch(`${apiBase}/link/telegram`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as LinkResponse;

      if (!response.ok || payload.status !== "ok" || !payload.data) {
        throw new Error(payload.error || "Gagal membuat kode Telegram");
      }

      setToken(payload.data.token);
      setDeepLink(payload.data.deepLink);
      setLinked(Boolean(payload.data.linked));
      setRevealed(Boolean(payload.data.token));
    } catch {
      setError("Tidak bisa membuat kode Telegram. Pastikan kamu sudah login.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (value: string, kind: "token" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind === "token" ? "token" : null);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setError("Gagal menyalin. Coba copy manual.");
    }
  };

  const handleActivate = async () => {
    setRevealed(true);
    if (!token) {
      await handleTelegramConnect();
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="text-base font-semibold text-slate-900">Integrasi</h3>
      <p className="mt-0.5 text-xs text-slate-500">Hubungkan bot agar input transaksi lebih cepat.</p>
      <div className="mt-3 grid gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-3 text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white">
              <Send size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Integrasi Telegram</p>
              <p className="text-xs text-slate-500">
                {loadingInitial
                  ? "Menyiapkan paket..."
                  : token
                    ? "Paket aktif"
                    : loading
                      ? "Mengaktifkan..."
                      : "Belum diaktifkan"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                <span className="mr-1 line-through">Rp 5.000</span>
                <span className="font-semibold text-emerald-700">Free</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
              {linked ? "Terhubung" : "Belum Link"}
            </span>
            {!revealed ? (
              <button
                type="button"
                onClick={handleActivate}
                disabled={loading || loadingInitial}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 disabled:cursor-wait"
              >
                {loading ? "Mengaktifkan..." : "Beli / Langganan"}
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-left opacity-90"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-500 text-white">
              <MessageCircleMore size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-700">Integrasi WhatsApp</p>
              <p className="text-xs text-slate-500">Segera hadir</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
            Coming Soon
          </span>
        </button>
      </div>

      {error ? <p className="mt-3 text-xs font-medium text-rose-600">{error}</p> : null}

      {revealed && token ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Kode Telegram</p>
          <code className="mt-2 block rounded-lg bg-white px-2 py-1 text-[11px] text-slate-700">
            link_{token}
          </code>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(`link_${token}`, "token")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1"
            >
              {copied === "token" ? <Check size={13} /> : <Copy size={13} />}
              {copied === "token" ? "Tersalin" : "Copy Kode"}
            </button>
            {deepLink ? (
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1"
              >
                <ExternalLink size={13} />
                Buka Telegram
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

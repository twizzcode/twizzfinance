"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const callbackURL = `${window.location.origin}/dashboard`;
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#e9edf2_0%,#f3f5f8_54%,#eceff4_100%)] p-3 sm:p-8 text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-10 top-8 h-56 w-56 rounded-full bg-slate-300/40 blur-[90px]" />
        <div className="absolute -right-12 bottom-12 h-64 w-64 rounded-full bg-slate-400/30 blur-[120px]" />
      </div>

      <main className="mx-auto flex h-full w-full max-w-[430px] items-center rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_16px_44px_rgba(15,23,42,0.16)]">
        <section className="flex h-full w-full flex-col">
          <div className="my-auto text-center">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl">
              <Image
                src="/logo.png"
                alt="twizzfinance logo"
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-semibold leading-tight">twizzfinance</h1>
            <p className="mt-2 text-sm text-slate-600">
              Catat pemasukan dan pengeluaran langsung dari chat, lalu pantau semua di dashboard.
            </p>
            <div className="mt-5">
              <Button
                className="h-11 w-full rounded-full bg-slate-900 px-6 text-white hover:bg-slate-800"
                onClick={handleGoogle}
                disabled={loading || !agreed}
              >
                <span className="inline-flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                  >
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-5.9s2.7-5.9 5.9-5.9c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.7 14.6 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.7-3.7 8.7-8.9 0-.6-.1-1.1-.2-1.9H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M3 7.5l3.2 2.3C7 8 9.3 6.1 12 6.1c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.7 14.6 3 12 3 8.3 3 5.1 5.1 3 7.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 21c2.5 0 4.6-.8 6.1-2.2l-2.8-2.3c-.8.6-1.9 1.1-3.3 1.1-3.7 0-5.1-2.4-5.4-3.7L3.3 16C5.2 18.9 8.3 21 12 21z"
                    />
                    <path
                      fill="#4285F4"
                      d="M20.7 12.1c0-.6-.1-1.1-.2-1.9H12v3.9h5.4c-.2 1.2-1 2.1-2 2.8l2.8 2.3c1.6-1.5 2.5-3.8 2.5-7.1z"
                    />
                  </svg>
                  {loading ? "Mengalihkan..." : "Login dengan Google"}
                </span>
              </Button>
            </div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-left text-xs text-slate-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              I agree to the Privacy Policy and Terms of Service of twizzfinance,
              including the processing of my data for account authentication.
            </span>
          </label>
        </section>
      </main>
    </div>
  );
}

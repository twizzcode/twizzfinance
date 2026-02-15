"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LinkResponse = {
  status: string;
  data?: {
    token: string;
    deepLink: string | null;
  };
  error?: string;
};

export function ConnectTelegramCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleConnect = useCallback(async () => {
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
        throw new Error(payload.error || "Gagal membuat link");
      }

      setToken(payload.data.token);
      setDeepLink(payload.data.deepLink);
    } catch (err) {
      setError("Gagal membuat link Telegram. Pastikan sudah login.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleConnect();
  }, [handleConnect]);

  const copyText = async (value: string, kind: "token" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "token") {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 1500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1500);
      }
    } catch {
      setError("Gagal menyalin ke clipboard.");
    }
  };

  return (
    <Card className="border-emerald-200/70 bg-white">
      <CardHeader>
        <CardTitle>Connect Telegram</CardTitle>
        <CardDescription>
          Hubungkan akun web dengan bot Telegram lewat link khusus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {token ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Token: {token}</span>
              <Button
                variant="outline"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => copyText(`link_${token}`, "token")}
              >
                {copiedToken ? "Copied" : "Copy Token"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Kirim ke bot: <span className="font-medium">link_{token}</span>
            </p>
            {deepLink ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="text-emerald-700 underline"
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka bot Telegram
                </a>
                <Button
                  variant="outline"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => copyText(deepLink, "link")}
                >
                  {copiedLink ? "Copied" : "Copy Link"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

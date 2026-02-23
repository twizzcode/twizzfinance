"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CreateTransactionPayload = {
  type: "EXPENSE" | "INCOME";
  amount: number;
  description?: string;
  category?: string;
  date?: string;
};

function todayJakartaInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function QuickAddTransactionForm() {
  const router = useRouter();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayJakartaInputValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountNumber = useMemo(() => Number(amount), [amount]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    setLoading(true);

    const payload: CreateTransactionPayload = {
      type,
      amount: amountNumber,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      date: date ? `${date}T12:00:00+07:00` : undefined,
    };

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        status?: string;
        error?: string;
      };

      if (!response.ok || data.status !== "ok") {
        throw new Error(data.error || "Gagal menyimpan transaksi.");
      }

      setAmount("");
      setDescription("");
      setCategory("");
      setSuccess("Transaksi berhasil disimpan.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menyimpan transaksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-800">Tambah Transaksi Cepat</h2>
        <p className="text-xs text-slate-500">Simpan transaksi manual dari dashboard tanpa Telegram.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`rounded-full border px-3 py-2 text-xs font-semibold ${
              type === "EXPENSE"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`rounded-full border px-3 py-2 text-xs font-semibold ${
              type === "INCOME"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            Pemasukan
          </button>
        </div>

        <input
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-slate-200 focus:ring"
          placeholder="Nominal (contoh: 50000)"
          required
        />

        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-slate-200 focus:ring"
          placeholder="Deskripsi (opsional)"
          maxLength={180}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-slate-200 focus:ring"
            placeholder="Kategori (opsional)"
            maxLength={80}
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-slate-200 focus:ring"
          />
        </div>

        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        {success ? <p className="text-xs font-medium text-emerald-700">{success}</p> : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-full bg-slate-900 text-white hover:bg-slate-800"
        >
          {loading ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </form>
    </section>
  );
}

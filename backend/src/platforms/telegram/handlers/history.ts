import { Context } from "telegraf";
import { getLinkedUserByTelegramId } from "../../../services/user.js";
import {
  getTodaySummary,
  getTodayTransactions,
  getTotalBalance,
} from "../../../services/transaction.js";
import { formatRupiah } from "../../../utils/currency.js";

/**
 * Handle /riwayat command - Show recent transactions
 */
export async function historyHandler(ctx: Context) {
  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply("❌ Tidak dapat mengidentifikasi pengguna.");
      return;
    }

    const user = await getLinkedUserByTelegramId(BigInt(telegramUser.id));
    if (!user) {
      await ctx.reply(
        "🔒 Akun Telegram belum terhubung.\n\n" +
        "Login di dashboard web lalu klik *Connect Telegram*.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const [transactionsToday, todaySummary, balance] = await Promise.all([
      getTodayTransactions(user.id),
      getTodaySummary(user.id),
      getTotalBalance(user.id),
    ]);

    const todayDate = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date());

    const formatAmount = (value: number) =>
      formatRupiah(value).replace(/^Rp\s?/, "Rp ");
    const formatSignedAmount = (value: number, sign: "+" | "-") =>
      `${sign}${formatAmount(value)}`;
    const formatDiff = (value: number) => {
      if (value === 0) return "Rp 0";
      const abs = formatAmount(Math.abs(value));
      return value > 0 ? `+${abs}` : `-${abs}`;
    };

    let message = `📅 ${todayDate}\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📊 Ringkasan Hari Ini\n";
    message += `🔴 Pengeluaran : ${formatAmount(todaySummary.totalExpense)}\n`;
    message += `🟢 Pemasukan   : ${formatAmount(todaySummary.totalIncome)}\n`;
    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `📉 Selisih     : ${formatDiff(todaySummary.totalIncome - todaySummary.totalExpense)}\n\n`;

    message += "🧾 Detail Transaksi\n";
    message += "──────────────────\n\n";

    if (transactionsToday.length === 0) {
      message += "Belum ada transaksi hari ini.\n\n";
      message += "━━━━━━━━━━━━━━━━━━\n";
      message += `💰 Saldo Saat Ini : ${formatAmount(balance.total)}`;
      await ctx.reply(message);
      return;
    }

    transactionsToday.forEach((t) => {
      const amount = Number(t.amount);
      const description = t.description || t.category?.nameId || "Transaksi";
      const icon = t.type === "EXPENSE" ? "🔴" : t.type === "INCOME" ? "🟢" : "🔵";
      const sign: "+" | "-" = t.type === "INCOME" ? "+" : "-";
      message += `${icon} ${formatSignedAmount(amount, sign)}   ${description}\n`;
    });

    message += "\n━━━━━━━━━━━━━━━━━━\n";
    message += `💰 Saldo Saat Ini : ${formatAmount(balance.total)}`;

    await ctx.reply(message);
  } catch (error) {
    console.error("Error in history handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

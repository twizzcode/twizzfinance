import { Context } from "telegraf";
import { getLinkedUserByTelegramId } from "../../../services/user.js";
import { getMonthSummary, getTotalBalance } from "../../../services/transaction.js";
import { formatRupiah } from "../../../utils/currency.js";

/**
 * Handle /ringkasan command - Show monthly summary
 */
export async function summaryHandler(ctx: Context) {
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

    const summary = await getMonthSummary(user.id);
    const { total: totalBalance } = await getTotalBalance(user.id);

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const now = new Date();
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();

    const netFlow = summary.totalIncome - summary.totalExpense;
    const netEmoji = netFlow >= 0 ? "📈" : "📉";
    const netSign = netFlow >= 0 ? "+" : "";

    let message = `📊 *Ringkasan ${monthName} ${year}*\n\n`;
    
    message += `🟢 Pemasukan: ${formatRupiah(summary.totalIncome)}\n`;
    message += `🔴 Pengeluaran: ${formatRupiah(summary.totalExpense)}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `${netEmoji} Selisih: ${netSign}${formatRupiah(Math.abs(netFlow))}\n\n`;
    
    message += `📝 Total transaksi: ${summary.transactionCount}\n`;
    message += `💰 Saldo saat ini: ${formatRupiah(totalBalance)}`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in summary handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

import { Context } from "telegraf";
import { getLinkedUserByTelegramId } from "../../../services/user.js";
import { deleteLastTransaction } from "../../../services/transaction.js";
import { formatRupiah } from "../../../utils/currency.js";
import { clearTransactionById } from "../transaction-state.js";

/**
 * Handle /hapus command - Delete last transaction
 */
export async function deleteHandler(ctx: Context) {
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

    const deleted = await deleteLastTransaction(user.id);

    if (!deleted) {
      await ctx.reply("📭 Tidak ada transaksi untuk dihapus.");
      return;
    }
    clearTransactionById(deleted.id);

    const typeText: Record<string, string> = {
      EXPENSE: "Pengeluaran",
      INCOME: "Pemasukan",
      TRANSFER: "Transfer",
    };

    await ctx.reply(
      `🗑️ *Transaksi Dihapus*\n\n` +
      `${typeText[deleted.type]}: ${formatRupiah(Number(deleted.amount))}\n` +
      `${deleted.description || "Tanpa keterangan"}\n\n` +
      `_Saldo telah dikembalikan._`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in delete handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

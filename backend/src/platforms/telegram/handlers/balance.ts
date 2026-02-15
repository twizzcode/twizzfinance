import { Context } from "telegraf";
import { getLinkedUserByTelegramId } from "../../../services/user.js";
import { getTotalBalance } from "../../../services/transaction.js";
import { formatRupiah } from "../../../utils/currency.js";

/**
 * Handle /saldo command - Show unified balance
 */
export async function balanceHandler(ctx: Context) {
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

    const { total } = await getTotalBalance(user.id);
    const message =
      "💰 *Saldo Gabungan*\n\n" +
      `${formatRupiah(total)}\n\n` +
      "_Semua transaksi digabung ke satu saldo._";

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in balance handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

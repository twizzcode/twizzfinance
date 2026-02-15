import { Context } from "telegraf";
import { unlinkTelegramAuth } from "../../../services/user.js";

/**
 * Handle /logout command - Unlink Telegram from web auth
 */
export async function logoutHandler(ctx: Context) {
  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply("❌ Tidak dapat mengidentifikasi pengguna.");
      return;
    }

    const result = await unlinkTelegramAuth(BigInt(telegramUser.id));

    if (!result.ok) {
      const message =
        result.reason === "NOT_LINKED"
          ? "ℹ️ Akun Telegram Anda belum terhubung."
          : "❌ Akun tidak ditemukan.";
      await ctx.reply(message);
      return;
    }

    await ctx.reply(
      "✅ Akun Telegram berhasil diputus dari dashboard.\n\n" +
        "Jika ingin menghubungkan lagi, login di dashboard dan klik Connect Telegram.",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in logout handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

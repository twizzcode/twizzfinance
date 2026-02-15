import { Context } from "telegraf";
import {
  findOrCreateUser,
  getPreferredDisplayNameByTelegramId,
  linkAuthUserToTelegram,
} from "../../../services/user.js";
import { markTelegramLinkTokenUsed, validateTelegramLinkToken } from "../../../services/link.js";

/**
 * Handle /start command - Register new user or welcome back existing user
 */
function buildStartWelcomeMessage(name: string, isReturning: boolean) {
  const greeting = isReturning ? "Halo kembali" : "Halo";

  return (
    `👋 ${greeting}, ${name}!\n\n` +
    `Selamat datang di Twizzfinance 💸\n` +
    `Mulai sekarang kamu nggak perlu ribet buka aplikasi lain —\n` +
    `cukup kirim chat, dan aku yang urus pencatatan keuanganmu.\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📝 Cara cepat mencatat:\n` +
    `• beli kopi 15 ribu\n` +
    `• makan 10k\n` +
    `• gaji 2 juta\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Aku akan otomatis:\n` +
    `✔ Mencatat transaksi\n` +
    `✔ Menghitung saldo\n` +
    `✔ Membuat laporan harian & bulanan\n\n` +
    `📊 Mau lihat ringkasan? Ketik /ringkasan\n` +
    `📖 Perlu panduan lengkap? Ketik /bantuan\n\n` +
    `Yuk mulai catat transaksi pertamamu hari ini ✨`
  );
}

function extractLinkToken(raw?: string) {
  const value = (raw || "").trim();
  if (!value) return null;
  if (value.startsWith("link_")) {
    const token = value.slice("link_".length).trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
  }
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
}

export async function startHandler(ctx: Context) {
  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply("❌ Tidak dapat mengidentifikasi pengguna.");
      return;
    }

    const text =
      ctx.message && "text" in ctx.message && typeof ctx.message.text === "string"
        ? ctx.message.text
        : "";
    const payload = text.split(" ")[1];
    const tokenFromPayload = extractLinkToken(payload);
    if (tokenFromPayload) {
      const token = tokenFromPayload;
      const validation = await validateTelegramLinkToken(token, BigInt(telegramUser.id));

      if (!validation.ok) {
        const message =
          validation.reason === "TOKEN_LINKED_TO_OTHER"
            ? "⚠️ Token ini sudah dipakai oleh Telegram lain."
            : "❌ Kode tidak valid. Silakan generate ulang di dashboard.";
        await ctx.reply(message);
        return;
      }

      const linkResult = await linkAuthUserToTelegram(validation.record.authUserId, telegramUser);
      if (!linkResult.ok) {
        const message =
          linkResult.reason === "AUTH_ALREADY_LINKED"
            ? "⚠️ Akun web ini sudah terhubung ke Telegram lain."
            : linkResult.reason === "TELEGRAM_ALREADY_LINKED"
              ? "⚠️ Akun Telegram ini sudah terhubung ke akun web lain."
              : "❌ Gagal menghubungkan akun. Silakan coba lagi.";
        await ctx.reply(message);
        return;
      }

      await markTelegramLinkTokenUsed(validation.record.id, BigInt(telegramUser.id));
      await ctx.reply("✅ Akun Telegram berhasil terhubung!");
      const linkedName =
        (await getPreferredDisplayNameByTelegramId(BigInt(telegramUser.id))) ||
        telegramUser.first_name ||
        "Teman";
      await ctx.reply(buildStartWelcomeMessage(linkedName, false));
      return;
    }

    const user = await findOrCreateUser({
      telegramId: BigInt(telegramUser.id),
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      telegramUsername: telegramUser.username,
    });

    if (!user) {
      await ctx.reply("❌ Gagal membuat akun. Silakan coba lagi.");
      return;
    }

    const isNewUser = user.createdAt.getTime() > Date.now() - 5000; // Created within last 5 seconds
    const displayName =
      (await getPreferredDisplayNameByTelegramId(BigInt(telegramUser.id))) ||
      telegramUser.first_name ||
      "Teman";

    if (!user.authUserId) {
      await ctx.reply(`👋 Halo, ${displayName}!`);
      await ctx.reply(
        `🔒 Akun Telegram belum terhubung.\n\n` +
        `Login di dashboard web lalu klik *Connect Telegram* untuk ambil kode.\n` +
        `Setelah itu, kirim kodenya ke chat ini.\n\n` +
        `Contoh:\n` +
        `\`link_xxx\` atau \`xxx\`\n`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await ctx.reply(buildStartWelcomeMessage(displayName, !isNewUser));
  } catch (error) {
    console.error("Error in start handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

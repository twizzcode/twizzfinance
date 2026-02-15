import { Context, Telegraf } from "telegraf";
import { env } from "../../config/env.js";
import {
  startHandler,
  loginHandler,
  balanceHandler,
  historyHandler,
  summaryHandler,
  deleteHandler,
  logoutHandler,
  helpHandler,
  receiptHandler,
  receiptConfirmHandler,
  receiptRejectHandler,
  messageHandler,
} from "./handlers/index.js";
import { getLinkedUserByTelegramId } from "../../services/user.js";

const ALLOWED_COMMANDS_WHEN_LOGGED_OUT = new Set(["start", "login"]);

function extractTokenFromText(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("link_")) {
    const token = value.slice("link_".length).trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
  }
  if (/\s/.test(value)) return null;
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
}

function isAllowedWhenLoggedOut(ctx: Context) {
  if (!ctx.message || !("text" in ctx.message) || typeof ctx.message.text !== "string") {
    return false;
  }

  const text = ctx.message.text.trim();
  if (!text) return false;

  if (text.startsWith("/")) {
    const commandPart = text.slice(1).split(/\s+/)[0] || "";
    const commandName = commandPart.split("@")[0]?.toLowerCase() || "";
    return ALLOWED_COMMANDS_WHEN_LOGGED_OUT.has(commandName);
  }

  return Boolean(extractTokenFromText(text));
}

// Create bot instance with custom timeout
export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN, {
  telegram: {
    apiRoot: "https://api.telegram.org",
    webhookReply: false,
  },
  handlerTimeout: 90_000, // 90 seconds
});

// Require login before using bot features
bot.use(async (ctx, next) => {
  const telegramUser = ctx.from;
  if (!telegramUser) {
    await next();
    return;
  }

  const linkedUser = await getLinkedUserByTelegramId(BigInt(telegramUser.id));
  if (linkedUser || isAllowedWhenLoggedOut(ctx)) {
    await next();
    return;
  }

  await ctx.reply(
    "🔒 Kamu belum login.\n\n" +
    "Silakan ketik /login untuk instruksi, atau langsung kirim kode dari dashboard untuk menghubungkan akun.",
    { parse_mode: "Markdown" }
  );
});

// Register command handlers
bot.command("start", startHandler);
bot.command("login", loginHandler);
bot.command("saldo", balanceHandler);
bot.command("balance", balanceHandler); // Alias
bot.command("riwayat", historyHandler);
bot.command("history", historyHandler); // Alias
bot.command("ringkasan", summaryHandler);
bot.command("summary", summaryHandler); // Alias
bot.command("hapus", deleteHandler);
bot.command("delete", deleteHandler); // Alias
bot.command("logout", logoutHandler);
bot.command("keluar", logoutHandler); // Alias
bot.command("bantuan", helpHandler);
bot.command("help", helpHandler); // Alias

// Register message handler for natural language input
bot.on("text", messageHandler);
bot.on("photo", receiptHandler);
bot.action("receipt_confirm", receiptConfirmHandler);
bot.action("receipt_reject", receiptRejectHandler);

// Error handler
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.").catch(console.error);
});

/**
 * Start the Telegram bot
 */
export async function startTelegramBot() {
  console.log("🤖 Starting Telegram bot...");
  
  // Set bot commands for menu (with retry)
  try {
    await bot.telegram.setMyCommands([
      { command: "start", description: "Mulai bot / Reset" },
      { command: "login", description: "Hubungkan akun Telegram" },
      { command: "saldo", description: "Lihat saldo gabungan" },
      { command: "riwayat", description: "Transaksi terakhir" },
      { command: "ringkasan", description: "Ringkasan bulan ini" },
      { command: "hapus", description: "Hapus transaksi terakhir" },
      { command: "logout", description: "Putuskan akun Telegram" },
      { command: "bantuan", description: "Panduan penggunaan" },
    ]);
  } catch (error) {
    console.warn("⚠️ Could not set commands (will retry on next start):", (error as Error).message);
  }

  // Start polling with retry options
  await bot.launch({
    dropPendingUpdates: true,  // Ignore old messages
  });
  
  console.log("✅ Telegram bot started successfully!");

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

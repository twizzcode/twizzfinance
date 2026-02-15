import { Context } from "telegraf";

/**
 * Handle /login command - Show login/link instructions
 */
export async function loginHandler(ctx: Context) {
  await ctx.reply(
    `🔐 *Login Dulu Ya*\n\n` +
    `Akun Telegram kamu belum terhubung.\n` +
    `Silakan login di dashboard web, klik *Connect Telegram*, lalu *copy-paste* kodenya ke chat ini.\n\n` +
    `Format kode:\n` +
    `\`link_xxx\` atau \`xxx\`\n\n` +
    `Kamu juga bisa langsung kirim kode tanpa ketik /login.`,
    { parse_mode: "Markdown" }
  );
}

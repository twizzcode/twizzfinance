import { Context } from "telegraf";
import { message } from "telegraf/filters";
import { getLinkedUserByTelegramId, linkAuthUserToTelegram } from "../../../services/user.js";
import { markTelegramLinkTokenUsed, validateTelegramLinkToken } from "../../../services/link.js";
import {
  deleteTransactionById,
  findLatestTransactionByRawInput,
  processAITransaction,
} from "../../../services/transaction.js";
import { parseTransaction, generateResponse } from "../../../services/ai/index.js";
import { consumeChatQuota } from "../../../services/chat.js";
import { formatRupiah } from "../../../utils/currency.js";
import { handleReceiptFollowup } from "./receipt.js";
import { consumeTransactionByMessage, registerTransactionMessage } from "../transaction-state.js";

const DELETE_REPLY_REGEX = /^(del|hapus|delete|undo|batal|cancel)$/i;
const TX_REF_REGEX = /tx_([a-z0-9]+)/i;

function extractLinkToken(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("link_")) {
    const token = value.slice("link_".length).trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
  }
  if (/\s/.test(value)) return null;
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
}

/**
 * Handle text messages - Parse and record transactions using AI
 */
export async function messageHandler(ctx: Context) {
  // Type guard for text messages
  if (!ctx.has(message("text"))) return;
  
  const text = ctx.message.text;
  
  // Ignore commands
  if (text.startsWith("/")) return;

  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply("❌ Tidak dapat mengidentifikasi pengguna.");
      return;
    }

    // Show typing indicator
    await ctx.sendChatAction("typing");

    const linkToken = extractLinkToken(text);
    if (linkToken) {
      const token = linkToken;
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
      await ctx.reply(
        `👋 Selamat datang di *Catatuangku*!\n\n` +
          `Senang banget bisa nemenin kamu di sini 😊\n` +
          `Mulai sekarang, kamu nggak perlu lagi repot buka aplikasi atau catat manual—cukup lewat chat, ` +
          `aku bantu kamu mencatat pemasukan dan pengeluaran biar keuanganmu lebih rapi dan terkontrol 💸\n\n` +
          `Tenang, cara pakainya simpel banget kok.\n\n` +
          `*Contoh cepat:*\n` +
          `• beli makan siang ayam 25k\n` +
          `• gaji bulan ini 2 juta\n\n` +
          `Bot akan otomatis mengenali apakah itu pemasukan atau pengeluaran 💡\n\n` +
          `*Perintah yang bisa kamu gunakan:*\n` +
          `• /saldo — lihat saldo gabungan\n` +
          `• /riwayat — transaksi terakhir\n` +
          `• /ringkasan — ringkasan bulan ini\n` +
          `• /hapus — hapus transaksi terakhir\n` +
          `• /logout — putuskan akun Telegram\n\n` +
          `📖 Ketik /bantuan kalau kamu ingin lihat panduan lengkap dan tips lainnya\n\n` +
          `Yuk, mulai catat keuangan pertamamu hari ini ✨\n` +
          `Aku siap bantu kapan aja 🤝`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const handledReceipt = await handleReceiptFollowup(ctx, text);
    if (handledReceipt) {
      return;
    }

    const user = await getLinkedUserByTelegramId(BigInt(telegramUser.id));
    if (!user) {
      await ctx.reply(
        "🔒 Akun Telegram belum terhubung.\n\n" +
        "Kirim kode dari dashboard ke chat ini.\n" +
        "Format yang didukung: `link_xxx` atau `xxx`.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const replyToMessageId = ctx.message.reply_to_message?.message_id;
    if (typeof replyToMessageId === "number" && DELETE_REPLY_REGEX.test(text.trim())) {
      let transactionId = consumeTransactionByMessage(BigInt(telegramUser.id), replyToMessageId);
      const replyTo = ctx.message.reply_to_message;
      const repliedText =
        replyTo && "text" in replyTo && typeof replyTo.text === "string"
          ? replyTo.text.trim()
          : "";

      if (!transactionId && repliedText) {
        const match = repliedText.match(TX_REF_REGEX);
        if (match?.[1]) {
          transactionId = match[1];
        }
      }

      if (!transactionId && repliedText) {
        const fromRawInput = await findLatestTransactionByRawInput(user.id, repliedText);
        if (fromRawInput) {
          transactionId = fromRawInput.id;
        }
      }

      if (!transactionId) {
        await ctx.reply(
          "⚠️ Tidak menemukan transaksi pada pesan yang kamu reply.\n" +
          "Reply ke pesan transaksi kamu atau pesan konfirmasi bot terbaru.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      const deleted = await deleteTransactionById(user.id, transactionId);
      if (!deleted) {
        await ctx.reply("⚠️ Transaksi tidak ditemukan atau sudah dihapus.");
        return;
      }

      await ctx.reply(
        `🗑️ *Transaksi Dihapus*\n\n` +
        `${deleted.description || "Tanpa keterangan"}\n` +
        `Jumlah: ${formatRupiah(Number(deleted.amount))}\n\n` +
        `_Saldo sudah dikembalikan._`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const quota = await consumeChatQuota(user.id, 100);
    if (!quota.ok) {
      await ctx.reply(
        `⚠️ Kuota chat hari ini sudah habis (${quota.limit}x).\n` +
        "Coba lagi besok atau upgrade akun.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Parse transaction using AI
    const parsed = await parseTransaction(text);

    if (!parsed) {
      await ctx.reply(
        "🤔 Maaf, saya tidak dapat memahami pesan Anda.\n\n" +
        "Coba format seperti:\n" +
        "• \"beli makan 20ribu cash\"\n" +
        "• \"gajian 5jt bca\"\n\n" +
        "Ketik /bantuan untuk panduan lengkap.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Process and save transaction
    const result = await processAITransaction(user.id, parsed, text);

    // Generate response
    const response = await generateResponse(
      parsed,
      Number(result.updatedBalance || 0)
    );

    const botMessage = await ctx.reply(response, { parse_mode: "Markdown" });
    registerTransactionMessage(
      BigInt(telegramUser.id),
      botMessage.message_id,
      result.transaction.id
    );
    registerTransactionMessage(
      BigInt(telegramUser.id),
      ctx.message.message_id,
      result.transaction.id
    );
  } catch (error) {
    console.error("Error in message handler:", error);
    await ctx.reply("❌ Terjadi kesalahan saat memproses transaksi. Silakan coba lagi.");
  }
}

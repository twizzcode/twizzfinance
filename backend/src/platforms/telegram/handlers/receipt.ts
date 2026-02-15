import { Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { getLinkedUserByTelegramId } from "../../../services/user.js";
import { consumeReceiptQuota, getReceiptQuota } from "../../../services/receipt.js";
import { parseReceiptTransaction, reviseReceiptTransaction } from "../../../services/ai/index.js";
import { processAITransaction } from "../../../services/transaction.js";
import { formatRupiah } from "../../../utils/currency.js";
import { clearPendingReceipt, getPendingReceipt, setPendingReceipt } from "../receipt-state.js";
import { registerTransactionMessage } from "../transaction-state.js";
import type { ParsedTransaction } from "../../../types/index.js";

const DAILY_RECEIPT_LIMIT = 3;
const CONFIRMATION_REGEX = /^(benar|ya|oke|ok|setuju|sip)$/i;
const REJECT_REGEX = /^(salah|tidak|nggak|gak|no)$/i;
const CANCEL_REGEX = /^(batal|cancel|stop)$/i;

function formatReceiptPreview(parsed: ParsedTransaction) {
  const typeLabel = {
    expense: "Pengeluaran",
    income: "Pemasukan",
  } as const;

  return (
    `🧾 *Hasil baca nota:*\n\n` +
    `• Jenis: ${typeLabel[parsed.type]}\n` +
    `• Jumlah: ${formatRupiah(parsed.amount)}\n` +
    `• Kategori: ${parsed.category}\n` +
    `• Catatan: ${parsed.description}\n\n` +
    "Tekan tombol *Benar* atau *Salah*.\n" +
    "Kalau salah, jelaskan bagian yang salah. Aku akan benerin lagi.\n" +
    "Kamu juga bisa ketik transaksi lengkap untuk memperbaiki."
  );
}

function receiptActionKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback("✅ Benar", "receipt_confirm"),
    Markup.button.callback("❌ Salah", "receipt_reject"),
  ]);
}

export async function receiptHandler(ctx: Context) {
  if (!ctx.has(message("photo"))) return;

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

    const quota = await getReceiptQuota(user.id, DAILY_RECEIPT_LIMIT);
    if (!quota.ok) {
      await ctx.reply(
        `⚠️ Kuota scan nota hari ini sudah habis (${quota.limit}x).\n` +
        "Coba lagi besok atau upgrade akun.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    if (!photo) {
      await ctx.reply("⚠️ Foto tidak ditemukan. Coba kirim ulang.");
      return;
    }

    await ctx.sendChatAction("typing");

    const file = await ctx.telegram.getFile(photo.file_id);
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const response = await fetch(fileLink.href);
    if (!response.ok) {
      await ctx.reply("❌ Gagal mengambil foto. Coba lagi.");
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const headerType = response.headers.get("content-type") || "";
    let mimeType = headerType;
    if (!mimeType || mimeType === "application/octet-stream") {
      const ext = file.file_path?.split(".").pop()?.toLowerCase();
      if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else mimeType = "image/jpeg";
    }
    const base64 = buffer.toString("base64");

    const parsed = await parseReceiptTransaction(base64, mimeType);
    if (!parsed) {
      await ctx.reply(
        "🤔 Maaf, nota tidak terbaca dengan jelas.\n\n" +
        "Coba kirim foto yang lebih terang dan fokus.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const consumeResult = await consumeReceiptQuota(user.id, DAILY_RECEIPT_LIMIT);
    if (!consumeResult.ok) {
      await ctx.reply(
        `⚠️ Kuota scan nota hari ini sudah habis (${consumeResult.limit}x).\n` +
        "Coba lagi besok atau upgrade akun.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    setPendingReceipt(BigInt(telegramUser.id), {
      userId: user.id,
      parsed,
      stage: "awaiting_confirmation",
      createdAt: Date.now(),
      sourceMessageId: ctx.message.message_id,
    });

    await ctx.reply(formatReceiptPreview(parsed), {
      parse_mode: "Markdown",
      reply_markup: receiptActionKeyboard().reply_markup,
    });
  } catch (error) {
    console.error("Error in receipt handler:", error);
    await ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}

export async function handleReceiptFollowup(ctx: Context, text: string) {
  const telegramUser = ctx.from;
  if (!telegramUser) {
    return false;
  }

  const pending = getPendingReceipt(BigInt(telegramUser.id));
  if (!pending) {
    return false;
  }

  if (CANCEL_REGEX.test(text)) {
    clearPendingReceipt(BigInt(telegramUser.id));
    await ctx.reply("✅ Oke, proses nota dibatalkan.");
    return true;
  }

  if (pending.stage === "awaiting_confirmation") {
    if (CONFIRMATION_REGEX.test(text)) {
      const result = await processAITransaction(pending.userId, pending.parsed, "receipt-image");
      clearPendingReceipt(BigInt(telegramUser.id));
      const botMessage = await ctx.reply(
        `✅ Nota tersimpan!\n` +
        `Saldo saat ini: ${formatRupiah(Number(result.updatedBalance || 0))}`,
        { parse_mode: "Markdown" }
      );
      registerTransactionMessage(
        BigInt(telegramUser.id),
        botMessage.message_id,
        result.transaction.id
      );
      if (typeof pending.sourceMessageId === "number") {
        registerTransactionMessage(
          BigInt(telegramUser.id),
          pending.sourceMessageId,
          result.transaction.id
        );
      }
      return true;
    }

    if (REJECT_REGEX.test(text)) {
      setPendingReceipt(BigInt(telegramUser.id), {
        ...pending,
        stage: "awaiting_correction",
      });
      await ctx.reply(
        "Boleh jelaskan bagian mana yang salah? Contoh:\n" +
        "- jumlahnya 25rb\n" +
        "- kategorinya transportasi\n" +
        "- catatan belanja bulanan",
        { parse_mode: "Markdown" }
      );
      return true;
    }

    await ctx.reply("Balas dengan *benar* atau *salah* ya.", { parse_mode: "Markdown" });
    return true;
  }

  if (pending.stage === "awaiting_correction") {
    const revised = await reviseReceiptTransaction(pending.parsed, text);
    if (!revised) {
      await ctx.reply(
        "Maaf, aku belum paham koreksinya. Bisa jelasin lagi dengan kalimat sederhana?",
        { parse_mode: "Markdown" }
      );
      return true;
    }

    setPendingReceipt(BigInt(telegramUser.id), {
      ...pending,
      parsed: revised,
      stage: "awaiting_confirmation",
    });

    await ctx.reply(formatReceiptPreview(revised), {
      parse_mode: "Markdown",
      reply_markup: receiptActionKeyboard().reply_markup,
    });
    return true;
  }

  return false;
}

export async function receiptConfirmHandler(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const pending = getPendingReceipt(BigInt(telegramUser.id));
  if (!pending || pending.stage !== "awaiting_confirmation") {
    await ctx.answerCbQuery("Tidak ada nota yang perlu dikonfirmasi.");
    return;
  }

  const result = await processAITransaction(pending.userId, pending.parsed, "receipt-image");
  clearPendingReceipt(BigInt(telegramUser.id));
  await ctx.answerCbQuery("Tersimpan!");
  const botMessage = await ctx.reply(
    `✅ Nota tersimpan!\n` +
    `Saldo saat ini: ${formatRupiah(Number(result.updatedBalance || 0))}`,
    { parse_mode: "Markdown" }
  );
  registerTransactionMessage(
    BigInt(telegramUser.id),
    botMessage.message_id,
    result.transaction.id
  );
  if (typeof pending.sourceMessageId === "number") {
    registerTransactionMessage(
      BigInt(telegramUser.id),
      pending.sourceMessageId,
      result.transaction.id
    );
  }
}

export async function receiptRejectHandler(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const pending = getPendingReceipt(BigInt(telegramUser.id));
  if (!pending || pending.stage !== "awaiting_confirmation") {
    await ctx.answerCbQuery("Tidak ada nota yang perlu dikoreksi.");
    return;
  }

  setPendingReceipt(BigInt(telegramUser.id), {
    ...pending,
    stage: "awaiting_correction",
  });

  await ctx.answerCbQuery("Oke, sebutkan koreksinya.");
  await ctx.reply(
    "Boleh jelaskan bagian mana yang salah? Contoh:\n" +
    "- jumlahnya 25rb\n" +
    "- kategorinya transportasi\n" +
    "- catatan belanja bulanan\n\n" +
    "Kamu juga bisa kirim transaksi lengkap supaya cepat.",
    { parse_mode: "Markdown" }
  );
}

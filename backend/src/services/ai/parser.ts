import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { ParsedTransaction } from "../../types/index.js";

const geminiKeys = (env.GEMINI_API_KEYS || env.GEMINI_API || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

if (geminiKeys.length === 0) {
  throw new Error("No Gemini API keys configured.");
}

let geminiIndex = 0;

function getGeminiClient() {
  const key = geminiKeys[geminiIndex % geminiKeys.length];
  geminiIndex = (geminiIndex + 1) % geminiKeys.length;
  return new GoogleGenAI({ apiKey: key });
}

// Zod schema for validation
const TransactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  category: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan yang membantu mengurai input transaksi keuangan dalam bahasa Indonesia ke format JSON.

TUGAS:
Analisis input pengguna dan ekstrak informasi transaksi keuangan.

FORMAT INPUT CONTOH:
- "beli ayam 10ribu cash" → pengeluaran makanan 10000
- "gajian 5jt bca" → pemasukan gaji 5000000
- "makan siang 25rb" → pengeluaran makanan 25000
- "dapat bonus 1jt" → pemasukan bonus 1000000
- "bayar listrik 500rb bca" → pengeluaran tagihan 500000
- "naik ojol 15rb gopay" → pengeluaran transportasi 15000

KONVERSI MATA UANG:
- ribu/rb/k = x1.000 (contoh: 10ribu = 10.000)
- juta/jt/m = x1.000.000 (contoh: 5jt = 5.000.000)

KATEGORI PENGELUARAN (WAJIB PILIH SALAH SATU):
- Food & Drinks (Makan & Minum)
- Transportation (Transportasi)
- Housing (Tempat Tinggal)
- Shopping (Belanja)
- Bills (Tagihan)
- Installments (Cicilan)
- Health (Kesehatan)
- Education (Pendidikan)
- Entertainment (Hiburan)
- Lifestyle (Gaya Hidup)
- Fashion
- Personal Care (Perawatan Diri)
- Social (Sosial)
- Lost Money (Uang Hilang)
- Donation (Donasi)
- Family (Keluarga)
- Children (Anak)
- Work Needs (Keperluan Kerja)
- Business (Bisnis)
- Investment (Investasi)
- Savings (Tabungan)
- Insurance (Asuransi)
- Tax (Pajak)
- Gadget & Electronics
- Subscription
- Travel (Liburan)
- Hobbies (Hobi)
- Sports (Olahraga)

KATEGORI PEMASUKAN:
- Salary/Gaji: gajian, gaji bulanan
- Bonus: bonus, THR
- Investment Return/Hasil Investasi: dividen, return
- Gift/Hadiah: hadiah, kado
- Other Income/Pendapatan Lain: freelance, jualan

CATATAN:
- Abaikan informasi akun/dompet/rekening, karena sistem memakai satu saldo gabungan.
- Jika pengguna menulis transfer antar akun, anggap sebagai "expense" dengan kategori yang paling relevan.

OUTPUT FORMAT (JSON ONLY):
{
  "type": "expense" | "income",
  "amount": number (dalam rupiah penuh, bukan ribu/juta),
  "category": string (nama kategori persis dari daftar di atas),
  "description": string (deskripsi singkat dalam bahasa Indonesia),
  "confidence": number (0-1, tingkat keyakinan parsing)
}

PENTING:
- Selalu output JSON valid saja, tanpa markdown atau penjelasan tambahan
- Amount harus dalam angka penuh (10000 bukan "10ribu")
- Jika tidak yakin, set confidence rendah (< 0.7)
- Untuk input yang tidak jelas, tetap coba parse dengan confidence rendah
- Jika transaksi pengeluaran, category HARUS salah satu dari 28 kategori pengeluaran di atas`;

export async function parseTransaction(input: string): Promise<ParsedTransaction | null> {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: "gemma-3-4b-it",  // Faster model for simple parsing tasks
      contents: `${SYSTEM_PROMPT}\n\nParse transaksi berikut: "${input}"`,
    });

    const parsed = parseGeminiJson(response.text || "");
    const validated = TransactionSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("Error parsing transaction:", error);
    return null;
  }
}

const RECEIPT_PROMPT = `${SYSTEM_PROMPT}\n\nTambahan aturan untuk gambar nota:\n- Baca teks dari nota/foto struk\n- Ambil total pembayaran sebagai amount\n- Jika ada nama merchant, masukkan ke description\n- Jika kategori tidak jelas, pilih "Shopping"\n- Jika akun pembayaran tidak jelas, gunakan "Cash"\n- Output JSON valid saja tanpa markdown`;

export async function parseReceiptTransaction(
  imageBase64: string,
  mimeType = "image/jpeg"
): Promise<ParsedTransaction | null> {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: RECEIPT_PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
    });

    const parsed = parseGeminiJson(response.text || "");
    const validated = TransactionSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return null;
  }
}

const RECEIPT_CORRECTION_PROMPT = `${SYSTEM_PROMPT}\n\nPerbaiki hasil parsing berdasarkan masukan pengguna.\n` +
  `- Gunakan JSON sebelumnya sebagai dasar\n` +
  `- Ikuti koreksi pengguna (jumlah, akun, kategori, deskripsi)\n` +
  `- Output JSON valid saja tanpa markdown`;

export async function reviseReceiptTransaction(
  previous: ParsedTransaction,
  feedback: string
): Promise<ParsedTransaction | null> {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: RECEIPT_CORRECTION_PROMPT },
            { text: `JSON sebelumnya: ${JSON.stringify(previous)}` },
            { text: `Koreksi pengguna: "${feedback}"` },
          ],
        },
      ],
    });

    const parsed = parseGeminiJson(response.text || "");
    const validated = TransactionSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error("Error revising receipt:", error);
    return null;
  }
}

function parseGeminiJson(responseText: string) {
  let jsonStr = responseText.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  return JSON.parse(jsonStr);
}

/**
 * Generate a friendly response message after transaction
 */
export async function generateResponse(
  transaction: ParsedTransaction,
  balance: number
): Promise<string> {
  const typeHeader = {
    expense: "🔴 PENGELUARAN TERCATAT",
    income: "🟢 PEMASUKAN TERCATAT",
  } as const;

  const nominalEmoji = {
    expense: "💸",
    income: "💰",
  } as const;

  const formattedAmountValue = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(transaction.amount)
    .replace(/^Rp\s?/, "Rp ");

  const signedAmount =
    transaction.type === "income"
      ? `+${formattedAmountValue}`
      : `-${formattedAmountValue}`;

  const formattedBalance = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(balance)
    .replace(/^Rp\s?/, "Rp ");

  let message = `${typeHeader[transaction.type]}\n\n`;
  message += `📂 Kategori     : ${transaction.category}\n`;
  message += `📝 Catatan      : ${transaction.description}\n`;
  message += `${nominalEmoji[transaction.type]} Nominal     : ${signedAmount}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 Saldo sekarang    : ${formattedBalance}`;

  if (transaction.confidence < 0.7) {
    message += `\n\n⚠️ _Keyakinan parsing rendah. Ketik /hapus untuk membatalkan._`;
  }

  return message;
}

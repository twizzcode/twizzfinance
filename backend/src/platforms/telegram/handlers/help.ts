import { Context } from "telegraf";

/**
 * Handle /bantuan command - Show help message
 */
export async function helpHandler(ctx: Context) {
  const message = `📖 *Panduan Penggunaan Bot*\n\n` +
    `🔒 *Sebelum mulai:*\n` +
    `Login di dashboard web dan klik *Connect Telegram* untuk menghubungkan akun.\n\n` +
    `*Mencatat Transaksi:*\n` +
    `Cukup kirim pesan biasa, saya akan mengenalinya secara otomatis!\n\n` +
    `*Contoh Pengeluaran:*\n` +
    `• "beli ayam 10ribu"\n` +
    `• "makan siang 25rb"\n` +
    `• "naik ojol 15rb"\n` +
    `• "bayar listrik 500rb"\n\n` +
    `*Contoh Pemasukan:*\n` +
    `• "gajian 5jt"\n` +
    `• "dapat bonus 1jt"\n` +
    `• "uang freelance 500rb"\n\n` +
    `*Nota/Struk:*\n` +
    `Kirim foto nota, bot akan membaca otomatis.\n` +
    `Batas harian: 3x per hari.\n\n` +
    `*Format Angka:*\n` +
    `• ribu/rb/k = x1.000 (10rb = 10.000)\n` +
    `• juta/jt = x1.000.000 (5jt = 5.000.000)\n\n` +
    `*Perintah:*\n` +
    `/start - Mulai/reset bot\n` +
    `/saldo - Lihat saldo gabungan\n` +
    `/riwayat - Transaksi terakhir\n` +
    `/ringkasan - Ringkasan bulan ini\n` +
    `/hapus - Hapus transaksi terakhir\n` +
    `/logout - Putuskan akun Telegram\n` +
    `/bantuan - Tampilkan panduan ini\n\n` +
    `💡 *Tips:*\n` +
    `Semua transaksi otomatis digabung ke satu saldo.\n` +
    `Reply ke pesan transaksi dengan \`hapus\` / \`del\` / \`delete\` untuk menghapus transaksi itu.`;

  await ctx.reply(message, { parse_mode: "Markdown" });
}

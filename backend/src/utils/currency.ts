/**
 * Currency utilities for Indonesian Rupiah (IDR)
 */

/**
 * Parse Indonesian currency shortcuts to number
 * Examples:
 * - "10ribu" or "10rb" or "10k" → 10000
 * - "5juta" or "5jt" or "5m" → 5000000
 * - "1.5jt" → 1500000
 * - "100" → 100
 */
export function parseIndonesianCurrency(input: string): number | null {
  if (!input) return null;

  // Remove spaces and convert to lowercase
  let cleaned = input.toLowerCase().replace(/\s+/g, "").replace(/rp\.?/g, "");

  // Handle decimal with comma (Indonesian style: 1,5jt)
  cleaned = cleaned.replace(",", ".");

  // Pattern matching for different formats
  const patterns: [RegExp, number][] = [
    [/^([\d.]+)(juta|jt|m)$/i, 1_000_000],
    [/^([\d.]+)(ribu|rb|k)$/i, 1_000],
    [/^([\d.]+)$/i, 1],
  ];

  for (const [pattern, multiplier] of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        return Math.round(value * multiplier);
      }
    }
  }

  return null;
}

/**
 * Format number to Indonesian Rupiah string
 * Examples:
 * - 10000 → "Rp 10.000"
 * - 1500000 → "Rp 1.500.000"
 */
export function formatRupiah(amount: number | string | bigint): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format number to short Indonesian format
 * Examples:
 * - 10000 → "10rb"
 * - 1500000 → "1,5jt"
 */
export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString("id-ID")}M`;
  }
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    return `${value % 1 === 0 ? value : value.toLocaleString("id-ID")}jt`;
  }
  if (amount >= 1_000) {
    const value = amount / 1_000;
    return `${value % 1 === 0 ? value : value.toLocaleString("id-ID")}rb`;
  }
  return amount.toString();
}

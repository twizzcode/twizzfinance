/**
 * Date utilities
 */

/**
 * Format date to Indonesian locale
 */
export function formatDateId(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/**
 * Format date to short format
 */
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/**
 * Get start of day in Jakarta timezone
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const jakartaDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  jakartaDate.setHours(0, 0, 0, 0);
  return jakartaDate;
}

/**
 * Get start of month in Jakarta timezone
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const jakartaDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  jakartaDate.setDate(1);
  jakartaDate.setHours(0, 0, 0, 0);
  return jakartaDate;
}

/**
 * Get YYYY-MM-DD key in Jakarta timezone
 */
export function getJakartaDayKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

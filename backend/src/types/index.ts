/**
 * Shared TypeScript types
 */

export interface ParsedTransaction {
  type: "expense" | "income";
  amount: number;
  category: string;
  description: string;
  confidence: number;
}

export interface BotContext {
  userId: string;
  platform: "telegram" | "whatsapp";
  platformUserId: string;
}

// Default categories for new users
export const DEFAULT_CATEGORIES = [
  // Expenses
  { name: "Food & Drinks", nameId: "Makan & Minum", icon: "🍔", type: "EXPENSE" as const },
  { name: "Transportation", nameId: "Transportasi", icon: "🚗", type: "EXPENSE" as const },
  { name: "Housing", nameId: "Tempat Tinggal", icon: "🏠", type: "EXPENSE" as const },
  { name: "Shopping", nameId: "Belanja", icon: "🛒", type: "EXPENSE" as const },
  { name: "Bills", nameId: "Tagihan", icon: "📄", type: "EXPENSE" as const },
  { name: "Installments", nameId: "Cicilan", icon: "📉", type: "EXPENSE" as const },
  { name: "Health", nameId: "Kesehatan", icon: "💊", type: "EXPENSE" as const },
  { name: "Education", nameId: "Pendidikan", icon: "📚", type: "EXPENSE" as const },
  { name: "Entertainment", nameId: "Hiburan", icon: "🎮", type: "EXPENSE" as const },
  { name: "Lifestyle", nameId: "Gaya Hidup", icon: "✨", type: "EXPENSE" as const },
  { name: "Fashion", nameId: "Fashion", icon: "👕", type: "EXPENSE" as const },
  { name: "Personal Care", nameId: "Perawatan Diri", icon: "🧴", type: "EXPENSE" as const },
  { name: "Social", nameId: "Sosial", icon: "🤝", type: "EXPENSE" as const },
  { name: "Lost Money", nameId: "Uang Hilang", icon: "🕳️", type: "EXPENSE" as const },
  { name: "Donation", nameId: "Donasi", icon: "🙏", type: "EXPENSE" as const },
  { name: "Family", nameId: "Keluarga", icon: "👨‍👩‍👧‍👦", type: "EXPENSE" as const },
  { name: "Children", nameId: "Anak", icon: "🧒", type: "EXPENSE" as const },
  { name: "Work Needs", nameId: "Keperluan Kerja", icon: "💼", type: "EXPENSE" as const },
  { name: "Business", nameId: "Bisnis", icon: "🏢", type: "EXPENSE" as const },
  { name: "Investment", nameId: "Investasi", icon: "📈", type: "EXPENSE" as const },
  { name: "Savings", nameId: "Tabungan", icon: "🏦", type: "EXPENSE" as const },
  { name: "Insurance", nameId: "Asuransi", icon: "🛡️", type: "EXPENSE" as const },
  { name: "Tax", nameId: "Pajak", icon: "🧾", type: "EXPENSE" as const },
  { name: "Gadget & Electronics", nameId: "Gadget & Elektronik", icon: "📱", type: "EXPENSE" as const },
  { name: "Subscription", nameId: "Langganan (Subscription)", icon: "🔁", type: "EXPENSE" as const },
  { name: "Travel", nameId: "Liburan", icon: "✈️", type: "EXPENSE" as const },
  { name: "Hobbies", nameId: "Hobi", icon: "🎨", type: "EXPENSE" as const },
  { name: "Sports", nameId: "Olahraga", icon: "🏃", type: "EXPENSE" as const },
  
  // Income
  { name: "Salary", nameId: "Gaji", icon: "💵", type: "INCOME" as const },
  { name: "Bonus", nameId: "Bonus", icon: "🎁", type: "INCOME" as const },
  { name: "Investment Return", nameId: "Hasil Investasi", icon: "📈", type: "INCOME" as const },
  { name: "Gift", nameId: "Hadiah", icon: "🎀", type: "INCOME" as const },
  { name: "Other Income", nameId: "Pendapatan Lain", icon: "💰", type: "INCOME" as const },
] as const;

// Default accounts
export const DEFAULT_ACCOUNTS = [
  { name: "Cash", type: "CASH" as const, icon: "💵", isDefault: true },
] as const;

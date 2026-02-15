import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  // WhatsApp (optional for now)
  WHATSAPP_TOKEN: z.string().optional(),
  VERIFY_TOKEN: z.string().optional(),

  // AI
  GEMINI_API: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(),

  // Auth
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),

  // App config
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;
const hasGeminiKey = Boolean(data.GEMINI_API);
const hasGeminiKeys = Boolean(data.GEMINI_API_KEYS);

if (!hasGeminiKey && !hasGeminiKeys) {
  console.error("❌ GEMINI_API or GEMINI_API_KEYS is required.");
  process.exit(1);
}

export const env = data;

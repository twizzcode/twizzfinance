// Force IPv4 for Node.js (fix for some network issues)
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { startTelegramBot } from "./platforms/telegram/index.js";
import { prisma } from "./lib/prisma.js";
import { startApiServer } from "./api/server.js";
import { env } from "./config/env.js";

async function main() {
  console.log("🚀 Starting Bot Telewa...");
  console.log("📅 Environment:", process.env.NODE_ENV || "development");

  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    // Start API first so dashboard stays available even if Telegram fails
    startApiServer();
    console.log(`🌐 API Port: ${env.API_PORT}`);

    try {
      await startTelegramBot();
      console.log("📱 Telegram: Active");
    } catch (botError) {
      console.error("⚠️ Telegram bot failed to start:", botError);
    }

    console.log("\n🎉 Bot Telewa is running!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 WhatsApp: Coming soon...");
    console.log("🌐 Web API: Active");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Failed to start:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

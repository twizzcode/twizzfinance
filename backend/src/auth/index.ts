import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { env } from "../config/env.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const auth = betterAuth({
  appName: "Telewa Finance",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  user: { modelName: "auth_user" },
  account: { modelName: "auth_account" },
  session: { modelName: "auth_session" },
  verification: { modelName: "auth_verification" },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },
});

auth.$context
  .then((ctx) => ctx.runMigrations())
  .catch((error) => {
    console.error("Failed to run Better Auth migrations:", error);
  });

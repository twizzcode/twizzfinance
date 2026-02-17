import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  // Use same-origin auth path so session cookie is stored on frontend domain.
  // The actual upstream backend is handled by Next.js rewrite in next.config.ts.
  baseURL: "/api/auth",
});

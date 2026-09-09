import "server-only";
import { z } from "zod";

const environmentSchema = z.strictObject({
  secret: z.string().min(32),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  origin: z.url(),
  databaseUrl: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
});

export function getAuthEnvironment() {
  const result = environmentSchema.safeParse({
    secret: process.env.AUTH_SECRET,
    clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
    origin: process.env.AUTH_URL,
    databaseUrl: process.env.DATABASE_URL,
  });
  if (!result.success) return null;

  const url = new URL(result.data.origin);
  const isLocal = process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.origin !== result.data.origin ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal))) {
    return null;
  }
  return result.data;
}

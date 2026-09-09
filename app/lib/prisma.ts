import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/app/generated/prisma/client";

const databaseGlobal = globalThis as typeof globalThis & { devstashPrisma?: PrismaClient };

export function getPrisma(databaseUrl: string) {
  if (!databaseGlobal.devstashPrisma) {
    databaseGlobal.devstashPrisma = new PrismaClient({
      adapter: new PrismaNeon({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 }),
      // Driver errors may contain connection details; never enable query/error logging.
      log: [],
    });
  }
  return databaseGlobal.devstashPrisma;
}

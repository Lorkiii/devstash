import "server-only";

import type { PrismaClient } from "@/app/generated/prisma/client";
import type { RateLimitRepository } from "./rate-limit";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "P2002";
}

// Conditional writes keep each fixed window atomic across application instances.
export function createRateLimitRepository(prisma: PrismaClient): RateLimitRepository {
  return {
    async resetExpiredWindow(key, expiredBefore, now) {
      const result = await prisma.authRateLimit.updateMany({
        where: { id: key, windowStartedAt: { lte: expiredBefore } },
        data: { windowStartedAt: now, count: 1 },
      });
      return result.count === 1;
    },

    async incrementActiveWindow(key, expiredBefore, maximum) {
      const result = await prisma.authRateLimit.updateMany({
        where: {
          id: key,
          windowStartedAt: { gt: expiredBefore },
          count: { lt: maximum },
        },
        data: { count: { increment: 1 } },
      });
      return result.count === 1;
    },

    async createWindow(key, now) {
      try {
        await prisma.authRateLimit.create({
          data: { id: key, windowStartedAt: now, count: 1 },
        });
        return true;
      } catch (error) {
        if (isUniqueConstraintError(error)) return false;
        throw error;
      }
    },
  };
}

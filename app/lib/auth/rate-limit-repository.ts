import "server-only";
import type { PrismaClient } from "@/app/generated/prisma/client";
import type { RateLimitedAuthAction } from "./config";

export interface AuthRateLimitRepository {
  resetExpiredWindow(
    action: RateLimitedAuthAction,
    expiredBefore: Date,
    now: Date,
  ): Promise<boolean>;
  incrementActiveWindow(
    action: RateLimitedAuthAction,
    expiredBefore: Date,
    maximum: number,
  ): Promise<boolean>;
  createWindow(action: RateLimitedAuthAction, now: Date): Promise<boolean>;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "P2002";
}

// Persistence stays behind this adapter so rate-limit policy is independent of Prisma.
export function createAuthRateLimitRepository(
  prisma: PrismaClient,
): AuthRateLimitRepository {
  return {
    async resetExpiredWindow(action, expiredBefore, now) {
      const result = await prisma.authRateLimit.updateMany({
        where: { id: action, windowStartedAt: { lte: expiredBefore } },
        data: { windowStartedAt: now, count: 1 },
      });
      return result.count === 1;
    },

    async incrementActiveWindow(action, expiredBefore, maximum) {
      const result = await prisma.authRateLimit.updateMany({
        where: {
          id: action,
          windowStartedAt: { gt: expiredBefore },
          count: { lt: maximum },
        },
        data: { count: { increment: 1 } },
      });
      return result.count === 1;
    },

    async createWindow(action, now) {
      try {
        await prisma.authRateLimit.create({
          data: { id: action, windowStartedAt: now, count: 1 },
        });
        return true;
      } catch (error) {
        if (isUniqueConstraintError(error)) return false;
        throw error;
      }
    },
  };
}

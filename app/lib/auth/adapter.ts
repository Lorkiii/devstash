import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { isGmailAddress, isVerifiedGmailUser } from "./policy";
import { AUTH_PROVIDER_ACCOUNT_TYPE, AUTH_PROVIDER_ID } from "./config";

export function createAuthAdapter(prisma: PrismaClient): Adapter {
  return restrictAuthAdapter(PrismaAdapter(prisma), (userId) =>
    prisma.account.findUnique({
      where: { userId_provider: { userId, provider: AUTH_PROVIDER_ID } },
      select: { providerAccountId: true, type: true },
    }));
}

export function restrictAuthAdapter(
  base: Adapter,
  findGoogleAccount: (userId: string) => Promise<{ providerAccountId: string; type: string } | null>,
): Adapter {
  return {
    ...base,
    async createUser(user) {
      if (!isGmailAddress(user.email) || !base.createUser) throw new Error("Identity not permitted");
      // Auth.js resets emailVerified for OAuth users. The Google signIn callback
      // has already required a verified claim before this adapter can be reached.
      return base.createUser({ ...user, name: null, image: null, emailVerified: new Date() });
    },
    async linkAccount(account) {
      // Explicit fields prevent Auth.js provider tokens from entering persistence.
      if (account.provider !== AUTH_PROVIDER_ID || account.type !== AUTH_PROVIDER_ACCOUNT_TYPE) {
        throw new Error("Account not permitted");
      }
      if (!base.linkAccount) throw new Error("Account persistence unavailable");
      await base.linkAccount({
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
      });
    },
    async getSessionAndUser(sessionToken) {
      const result = await base.getSessionAndUser?.(sessionToken);
      if (!result || !isVerifiedGmailUser(result.user)) return null;
      const account = await findGoogleAccount(result.user.id);
      if (!account?.providerAccountId || account.type !== AUTH_PROVIDER_ACCOUNT_TYPE) return null;
      return result;
    },
  };
}

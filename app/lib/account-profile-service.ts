import "server-only";

import type { AccountProfile } from "./account-profile";

interface AccountProfileRow {
  email: string;
  name: string | null;
}

export interface AccountProfileDatabase {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { email: true; name: true };
    }): Promise<AccountProfileRow | null>;
    updateMany(args: {
      where: { id: string };
      data: { name: string | null };
    }): Promise<{ count: number }>;
  };
}

function toAccountProfile(row: AccountProfileRow): AccountProfile {
  return { email: row.email, displayName: row.name };
}

export async function getAccountProfile(database: AccountProfileDatabase, ownerId: string) {
  const row = await database.user.findUnique({
    where: { id: ownerId },
    select: { email: true, name: true },
  });
  return row ? toAccountProfile(row) : null;
}

export async function updateAccountProfile(
  database: AccountProfileDatabase,
  ownerId: string,
  displayName: string | null,
) {
  // Only the verified session's user ID can select the row to update.
  const result = await database.user.updateMany({
    where: { id: ownerId },
    data: { name: displayName },
  });
  return result.count === 1 ? getAccountProfile(database, ownerId) : null;
}

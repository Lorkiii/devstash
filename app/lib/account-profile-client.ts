"use client";

import { accountProfileResponseSchema, type AccountProfile } from "./account-profile";

export class AccountProfileRequestError extends Error {
  override readonly name = "AccountProfileRequestError";
}

async function readProfileResponse(response: Response): Promise<AccountProfile> {
  if (!response.ok) throw new AccountProfileRequestError("Account profile request failed.");

  const parsed = accountProfileResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new AccountProfileRequestError("Account profile response was invalid.");
  return parsed.data.data;
}

export async function fetchAccountProfile(signal: AbortSignal): Promise<AccountProfile> {
  const response = await fetch("/api/account/profile", {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  return readProfileResponse(response);
}

export async function persistAccountProfile(displayName: string | null): Promise<AccountProfile> {
  const response = await fetch("/api/account/profile", {
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  return readProfileResponse(response);
}

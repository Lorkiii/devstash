import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { accountProfileUpdateSchema } from "../app/lib/account-profile";
import { GET, PATCH } from "../app/api/account/profile/route";
import { AccountAvatar, accountInitials } from "../app/components/account/account-avatar";
import {
  getAccountProfile,
  updateAccountProfile,
  type AccountProfileDatabase,
} from "../app/lib/account-profile-service";

function fixture(): {
  database: AccountProfileDatabase;
  reads: string[];
  writes: Array<{ ownerId: string; displayName: string | null }>;
  names: Map<string, string | null>;
} {
  const names = new Map<string, string | null>([
    ["owner-a", null],
    ["owner-b", "Other user"],
  ]);
  const reads: string[] = [];
  const writes: Array<{ ownerId: string; displayName: string | null }> = [];
  const database: AccountProfileDatabase = {
    user: {
      async findUnique({ where }) {
        reads.push(where.id);
        if (!names.has(where.id)) return null;
        return { email: `${where.id}@gmail.com`, name: names.get(where.id) ?? null };
      },
      async updateMany({ where, data }) {
        writes.push({ ownerId: where.id, displayName: data.name });
        if (!names.has(where.id)) return { count: 0 };
        names.set(where.id, data.name);
        return { count: 1 };
      },
    },
  };
  return { database, reads, writes, names };
}

test("display name validation normalizes, clears, and bounds the account label", () => {
  assert.deepEqual(accountProfileUpdateSchema.parse({ displayName: "  José Dev  " }), {
    displayName: "José Dev",
  });
  assert.deepEqual(accountProfileUpdateSchema.parse({ displayName: "   " }), { displayName: null });
  assert.deepEqual(accountProfileUpdateSchema.parse({ displayName: null }), { displayName: null });
  assert.equal(accountProfileUpdateSchema.safeParse({ displayName: "😀".repeat(40) }).success, true);

  for (const input of [
    { displayName: "x".repeat(41) },
    { displayName: "Line\nbreak" },
    { displayName: "Name\u202e" },
    { displayName: 23 },
    { displayName: "Valid", ownerId: "owner-b" },
    {},
  ]) {
    assert.equal(accountProfileUpdateSchema.safeParse(input).success, false);
  }
});

test("generated avatar uses initials without loading an external photo or interpreting markup", () => {
  assert.equal(accountInitials("José Dev"), "JD");
  assert.equal(accountInitials(null), null);
  const markup = renderToStaticMarkup(createElement(AccountAvatar, { displayName: "<script>" }));
  assert.match(markup, /&lt;/);
  assert.doesNotMatch(markup, /<script|<img/i);
});

test("profile reads and writes use only the verified owner ID", async () => {
  const state = fixture();
  assert.deepEqual(await getAccountProfile(state.database, "owner-a"), {
    email: "owner-a@gmail.com",
    displayName: null,
  });
  assert.deepEqual(await updateAccountProfile(state.database, "owner-a", "Owner name"), {
    email: "owner-a@gmail.com",
    displayName: "Owner name",
  });
  assert.equal(state.names.get("owner-a"), "Owner name");
  assert.equal(state.names.get("owner-b"), "Other user");
  assert.deepEqual(state.writes, [{ ownerId: "owner-a", displayName: "Owner name" }]);
  assert.deepEqual(state.reads, ["owner-a", "owner-a"]);

  assert.deepEqual(await updateAccountProfile(state.database, "owner-a", null), {
    email: "owner-a@gmail.com",
    displayName: null,
  });
  assert.equal(await updateAccountProfile(state.database, "missing-user", "Not saved"), null);
  assert.equal(await getAccountProfile(state.database, "missing-user"), null);
});

test("profile endpoints deny requests without a verified session", async () => {
  const url = "https://devstash.example.test/api/account/profile";
  const read = await GET(new Request(url));
  const write = await PATCH(new Request(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: "Not saved" }),
  }));
  for (const response of [read, write]) {
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Authentication required.",
    });
  }
});

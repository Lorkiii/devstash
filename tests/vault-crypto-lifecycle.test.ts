import assert from "node:assert/strict";
import test from "node:test";
import { clearBytes, encodePassphrase } from "../app/lib/vault-crypto/bytes";
import {
  changeVaultPassphrase,
  createRecoveryRotationDraft,
  createVaultSetupDraft,
  recoverVaultAndReplacePassphrase,
  unlockVaultWithPassphrase,
} from "../app/lib/vault-crypto/operations";
import { parseVaultEncryptionProfile } from "../app/lib/vault-crypto/profile";

const OWNER_ID = "phase5_user";
const PROFILE_ID = "018f0d86-7b3a-4f9c-8a21-123456789abc";
const INITIAL_PASSPHRASE = "synthetic phase five passphrase";
const CHANGED_PASSPHRASE = "synthetic changed passphrase";
const RECOVERED_PASSPHRASE = "synthetic recovered passphrase";

test("setup produces two independent wrappers and normal unlock fails closed", async () => {
  const passphrase = encodePassphrase(INITIAL_PASSPHRASE);
  const incorrect = encodePassphrase("synthetic incorrect passphrase");
  try {
    const draft = await createVaultSetupDraft(OWNER_ID, PROFILE_ID, passphrase);
    assert.equal(draft.recoveryPhrase.split(" ").length, 24);
    assert.deepEqual(parseVaultEncryptionProfile(draft.profile), draft.profile);
    assert.equal(draft.dek.extractable, false);

    const unlocked = await unlockVaultWithPassphrase(OWNER_ID, draft.profile, passphrase);
    assert.equal(unlocked.dek.extractable, false);
    await assert.rejects(
      () => unlockVaultWithPassphrase(OWNER_ID, draft.profile, incorrect),
      /authentication failed/u,
    );
  } finally {
    clearBytes(passphrase, incorrect);
  }
});

test("passphrase replacement rewraps the same DEK and preserves recovery metadata", async () => {
  const initial = encodePassphrase(INITIAL_PASSPHRASE);
  const changed = encodePassphrase(CHANGED_PASSPHRASE);
  try {
    const setup = await createVaultSetupDraft(OWNER_ID, PROFILE_ID, initial);
    const replacement = await changeVaultPassphrase(
      OWNER_ID,
      setup.profile,
      initial,
      changed,
    );

    assert.equal(replacement.profile.profileRevision, 2);
    assert.equal(replacement.profile.passphraseWrapRevision, 2);
    assert.equal(replacement.profile.recoveryWrapRevision, 1);
    assert.deepEqual(replacement.profile.recovery, setup.profile.recovery);
    await unlockVaultWithPassphrase(OWNER_ID, replacement.profile, changed);
    await assert.rejects(
      () => unlockVaultWithPassphrase(OWNER_ID, replacement.profile, initial),
      /authentication failed/u,
    );
  } finally {
    clearBytes(initial, changed);
  }
});

test("recovery requires the correct phrase and replaces the passphrase before unlock", async () => {
  const initial = encodePassphrase(INITIAL_PASSPHRASE);
  const recovered = encodePassphrase(RECOVERED_PASSPHRASE);
  try {
    const setup = await createVaultSetupDraft(OWNER_ID, PROFILE_ID, initial);
    await assert.rejects(
      () => recoverVaultAndReplacePassphrase(
        OWNER_ID,
        setup.profile,
        `${"abandon ".repeat(23)}art`,
        recovered,
      ),
      /authentication failed/u,
    );

    const replacement = await recoverVaultAndReplacePassphrase(
      OWNER_ID,
      setup.profile,
      setup.recoveryPhrase,
      recovered,
    );
    assert.equal(replacement.profile.profileRevision, 2);
    assert.equal(replacement.profile.passphraseWrapRevision, 2);
    await unlockVaultWithPassphrase(OWNER_ID, replacement.profile, recovered);
  } finally {
    clearBytes(initial, recovered);
  }
});

test("Recovery Phrase rotation replaces only the current recovery wrapper", async () => {
  const initial = encodePassphrase(INITIAL_PASSPHRASE);
  const recovered = encodePassphrase(RECOVERED_PASSPHRASE);
  try {
    const setup = await createVaultSetupDraft(OWNER_ID, PROFILE_ID, initial);
    const rotation = await createRecoveryRotationDraft(
      OWNER_ID,
      setup.profile,
      initial,
    );

    assert.notEqual(rotation.recoveryPhrase, setup.recoveryPhrase);
    assert.equal(rotation.profile.profileRevision, 2);
    assert.equal(rotation.profile.passphraseWrapRevision, 1);
    assert.equal(rotation.profile.recoveryWrapRevision, 2);
    assert.deepEqual(rotation.profile.passphraseKeyWrap, setup.profile.passphraseKeyWrap);
    await assert.rejects(
      () => recoverVaultAndReplacePassphrase(
        OWNER_ID,
        rotation.profile,
        setup.recoveryPhrase,
        recovered,
      ),
      /authentication failed/u,
    );
    await recoverVaultAndReplacePassphrase(
      OWNER_ID,
      rotation.profile,
      rotation.recoveryPhrase,
      recovered,
    );
  } finally {
    clearBytes(initial, recovered);
  }
});

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individual developers with verified Gmail identities. Each authenticated person owns a separate private vault and uses DevStash to manage sensitive developer information without sharing or team workflows.

## Product Purpose

DevStash is a personal, client-encrypted workspace for developer secrets, complete `.env` files, private notes, projects, and tasks. It helps an individual keep this material organized while ensuring that a Google sign-in establishes identity but does not itself unlock encrypted vault data.

## Positioning

DevStash separates authentication from decryption: verified Google sign-in reaches an authenticated but locked workspace, while a Vault Passphrase or Recovery Phrase derives key material locally and unlocks data only in the browser. The server and database handle ciphertext and approved metadata, not vault plaintext.

## Operating Context

The product is used as an individual developer workspace. A person signs in with Google, enters a locked vault, completes local vault setup or unlock, and then works with encrypted records in the browser. Refresh, sign-out, explicit lock, inactivity, and session loss return the vault to a locked state.

## Capabilities and Constraints

- Google-only sign-in is limited to verified Gmail identities; authentication and vault unlocking remain independent.
- The vault supports encrypted Generic Secrets, Projects, complete `.env` bundles, Notes, Tasks, task categories, and relationships among workspace records.
- It provides local-only decrypted search, password generation using browser cryptographic randomness, masking, timed reveal, explicit copy, and encrypted backup export and restore validation.
- Vault plaintext, passphrases, Recovery Phrases, and plaintext keys must remain in ephemeral browser memory. Private content must not be sent to server code, persisted in browser storage, or exposed through URLs, logs, caches, analytics, or database plaintext columns.
- V1 is for individuals only. Teams, sharing, public links, extra OAuth providers, server-side search, browser extensions, mobile/desktop apps, and third-party integrations are outside its scope.
- DevStash is a security-learning project and must not claim to be audited, zero-knowledge, unbreakable, or suitable for important real credentials without independent evidence.

## Brand Commitments

The product name is DevStash. Its voice must be clear about security boundaries and limitations, without overstating protection or fabricating trust claims.

## Evidence on Hand

- [README.md](README.md) documents the implemented capabilities, security model, local-development workflow, and repository structure.
- [AGENTS.md](AGENTS.md) is the authoritative security and scope policy.
- The repository contains the Next.js application, synthetic tests, Prisma schema and migrations, and local UI assets. There are no approved external testimonials, customer stories, pricing claims, or independent audit evidence to present as product proof.

## Product Principles

1. Keep Google identity verification and local decryption as separate states.
2. Encrypt private user-authored information by default and keep plaintext in the browser only.
3. Make locking, recovery limits, copying, and other sensitive actions explicit to the individual user.
4. Favor a focused individual-developer workspace over speculative collaboration or integration features.
5. Communicate security capabilities and limits precisely.

## Accessibility & Inclusion

Preserve keyboard access, visible focus, semantic labels, touch targets, readable contrast, screen-reader feedback that does not announce secret values, and reduced-motion support.

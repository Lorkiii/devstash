import type { VaultData } from "./vault-data.types";

// Synthetic fixtures for the UI preview. Every value below is fake and marked
// as such. This module is replaced by client-side decryption of ciphertext
// fetched from the API in the vault-items phase; nothing here is ever
// persisted or sent anywhere.

const PROJECT_ORBITAL = "prj_orbital";
const PROJECT_NEBULA = "prj_nebula";
const PROJECT_SITE = "prj_site";

export const MOCK_VAULT_DATA: VaultData = {
  projects: [
    {
      id: PROJECT_ORBITAL,
      name: "orbital-api",
      description: "Backend for the telemetry ingestion service. Node + Postgres.",
      updatedAt: "2026-09-06T14:10:00Z",
    },
    {
      id: PROJECT_NEBULA,
      name: "nebula-dashboard",
      description: "Internal analytics dashboard. Next.js frontend, reads from orbital-api.",
      updatedAt: "2026-09-04T09:32:00Z",
    },
    {
      id: PROJECT_SITE,
      name: "personal-site",
      description: "Static portfolio site deployed to a static host.",
      updatedAt: "2026-08-28T19:45:00Z",
    },
  ],

  secrets: [
    {
      id: "sec_01",
      type: "LOGIN",
      title: "Neon console",
      projectId: PROJECT_ORBITAL,
      fields: [
        { key: "url", label: "URL", value: "https://console.example-neon.test", secret: false },
        { key: "username", label: "Username", value: "demo.dev@example.test", secret: false },
        { key: "password", label: "Password", value: "FAKE-correct-horse-battery-staple-01", secret: true },
      ],
      tags: ["infra", "database"],
      updatedAt: "2026-09-06T14:10:00Z",
    },
    {
      id: "sec_02",
      type: "API_KEY",
      title: "Stripe test key",
      projectId: PROJECT_NEBULA,
      fields: [
        { key: "publishable", label: "Publishable key", value: "pk_test_FAKE0000000000000000", secret: false },
        { key: "secret", label: "Secret key", value: "sk_test_FAKE1111111111111111111111", secret: true },
      ],
      notes: "Test mode only. Rotate before any real integration.",
      tags: ["payments"],
      updatedAt: "2026-09-05T11:00:00Z",
    },
    {
      id: "sec_03",
      type: "DATABASE",
      title: "orbital-api · pooled connection",
      projectId: PROJECT_ORBITAL,
      fields: [
        { key: "host", label: "Host", value: "ep-fake-pooler.example-neon.test", secret: false },
        { key: "database", label: "Database", value: "orbital", secret: false },
        { key: "user", label: "User", value: "orbital_app", secret: false },
        { key: "password", label: "Password", value: "FAKE-db-password-do-not-use", secret: true },
        {
          key: "connection",
          label: "Connection string",
          value: "postgres://orbital_app:FAKE-db-password-do-not-use@ep-fake-pooler.example-neon.test/orbital?sslmode=require",
          secret: true,
        },
      ],
      tags: ["database", "prod"],
      updatedAt: "2026-09-03T08:20:00Z",
    },
    {
      id: "sec_04",
      type: "SSH_KEY",
      title: "deploy@personal-site",
      projectId: PROJECT_SITE,
      fields: [
        { key: "host", label: "Host", value: "deploy.example.test", secret: false },
        { key: "user", label: "User", value: "deploy", secret: false },
        {
          key: "private",
          label: "Private key",
          value: "-----BEGIN OPENSSH PRIVATE KEY-----\nFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE\n-----END OPENSSH PRIVATE KEY-----",
          secret: true,
        },
        { key: "fingerprint", label: "Fingerprint", value: "SHA256:FAKEfingerprint0000000000000000000000000", secret: false },
      ],
      tags: ["deploy"],
      updatedAt: "2026-08-28T19:45:00Z",
    },
    {
      id: "sec_05",
      type: "RECOVERY_CODE",
      title: "GitHub recovery codes",
      fields: [
        {
          key: "codes",
          label: "Codes",
          value: "fake1-00001\nfake2-00002\nfake3-00003\nfake4-00004\nfake5-00005",
          secret: true,
        },
      ],
      notes: "Two codes already used.",
      tags: ["account"],
      updatedAt: "2026-07-14T16:00:00Z",
    },
    {
      id: "sec_06",
      type: "GENERIC_SECRET",
      title: "Webhook signing secret",
      projectId: PROJECT_ORBITAL,
      fields: [
        { key: "value", label: "Secret", value: "whsec_FAKE22222222222222222222", secret: true },
      ],
      tags: ["webhooks"],
      updatedAt: "2026-09-01T10:05:00Z",
    },
    {
      id: "sec_07",
      type: "API_KEY",
      title: "Resend email API",
      projectId: PROJECT_NEBULA,
      fields: [
        { key: "key", label: "API key", value: "re_FAKE_333333333333333333333333", secret: true },
      ],
      tags: ["email"],
      updatedAt: "2026-08-30T13:15:00Z",
    },
    {
      id: "sec_08",
      type: "LOGIN",
      title: "Cloudflare dashboard",
      projectId: PROJECT_SITE,
      fields: [
        { key: "url", label: "URL", value: "https://dash.example-cloudflare.test", secret: false },
        { key: "username", label: "Username", value: "demo.dev@example.test", secret: false },
        { key: "password", label: "Password", value: "FAKE-orbit-nebula-4402", secret: true },
      ],
      tags: ["dns"],
      updatedAt: "2026-08-22T07:50:00Z",
    },
  ],

  envBundles: [
    {
      id: "env_01",
      projectId: PROJECT_ORBITAL,
      environment: "development",
      content: [
        "NODE_ENV=development",
        "PORT=4000",
        "DATABASE_URL=postgres://orbital_app:FAKE-dev-password@localhost:5432/orbital",
        "LOG_LEVEL=debug",
        "WEBHOOK_SECRET=whsec_FAKE_dev_000000",
      ].join("\n"),
      updatedAt: "2026-09-06T14:10:00Z",
    },
    {
      id: "env_02",
      projectId: PROJECT_ORBITAL,
      environment: "production",
      content: [
        "NODE_ENV=production",
        "PORT=8080",
        "DATABASE_URL=postgres://orbital_app:FAKE-db-password-do-not-use@ep-fake-pooler.example-neon.test/orbital?sslmode=require",
        "LOG_LEVEL=info",
        "WEBHOOK_SECRET=whsec_FAKE22222222222222222222",
      ].join("\n"),
      updatedAt: "2026-09-03T08:20:00Z",
    },
    {
      id: "env_03",
      projectId: PROJECT_NEBULA,
      environment: "local",
      content: [
        "NEXT_PUBLIC_API_BASE=http://localhost:4000",
        "STRIPE_SECRET_KEY=sk_test_FAKE1111111111111111111111",
        "RESEND_API_KEY=re_FAKE_333333333333333333333333",
      ].join("\n"),
      updatedAt: "2026-09-05T11:00:00Z",
    },
    {
      id: "env_04",
      projectId: PROJECT_SITE,
      environment: "build",
      content: ["SITE_URL=https://example.test", "ANALYTICS_ENABLED=false"].join("\n"),
      updatedAt: "2026-08-28T19:45:00Z",
    },
  ],

  notes: [
    {
      id: "note_01",
      projectId: PROJECT_ORBITAL,
      title: "Neon branch workflow",
      body: "Create a branch per migration test.\n\n1. neon branches create --name migrate-test\n2. Point DIRECT_URL at the branch.\n3. Run the migration, verify, then delete the branch.\n\nNever run migrations against main without a tested branch first.",
      tags: ["database", "process"],
      updatedAt: "2026-09-02T18:30:00Z",
    },
    {
      id: "note_02",
      projectId: PROJECT_NEBULA,
      title: "Dashboard chart ideas",
      body: "Ingest rate per minute, p95 latency, error budget burn-down.\n\nKeep the palette to two accent colors so the charts read at a glance.",
      tags: ["design"],
      updatedAt: "2026-08-31T21:12:00Z",
    },
    {
      id: "note_03",
      title: "Passphrase hygiene",
      body: "Use a long passphrase you can type from memory. There is no server-side reset: losing it means losing the vault content.\n\nStore a paper copy somewhere physically safe.",
      tags: ["security"],
      updatedAt: "2026-08-20T09:00:00Z",
    },
    {
      id: "note_04",
      projectId: PROJECT_SITE,
      title: "Deploy checklist",
      body: "- Build passes locally\n- Lighthouse > 95\n- Check OG image\n- Tag release",
      tags: ["deploy", "checklist"],
      updatedAt: "2026-08-27T12:00:00Z",
    },
  ],

  tasks: [
    { id: "task_01", projectId: PROJECT_ORBITAL, title: "Rotate webhook signing secret", done: false, dueDate: "2026-09-10", sortOrder: 1 },
    { id: "task_02", projectId: PROJECT_ORBITAL, title: "Add index on events(created_at)", description: "Ingest queries scan the full table after 2M rows.", done: false, dueDate: "2026-09-12", sortOrder: 2 },
    { id: "task_03", projectId: PROJECT_NEBULA, title: "Wire Stripe test webhook locally", done: false, dueDate: "2026-09-09", sortOrder: 1 },
    { id: "task_04", projectId: PROJECT_NEBULA, title: "Replace placeholder chart data", done: true, sortOrder: 2 },
    { id: "task_05", projectId: PROJECT_SITE, title: "Write post about envelope encryption", done: false, dueDate: "2026-09-20", sortOrder: 1 },
    { id: "task_06", projectId: PROJECT_SITE, title: "Renew domain", done: false, dueDate: "2026-10-01", sortOrder: 2 },
    { id: "task_07", title: "Back up vault (encrypted export)", done: false, dueDate: "2026-09-15", sortOrder: 1 },
    { id: "task_08", title: "Review auto-lock duration", done: true, sortOrder: 2 },
  ],
};

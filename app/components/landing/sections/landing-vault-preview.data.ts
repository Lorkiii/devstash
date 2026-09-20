import type { PreviewModule } from "./landing-vault-preview.types";

// Public, fictional content for the landing illustration; no vault data is used.
export const LANDING_PREVIEW_MODULES: readonly PreviewModule[] = [
  {
    id: "secrets",
    number: "01",
    label: "Secrets",
    caption: "Credentials without scattered tabs.",
    records: [
      {
        kind: "secret",
        id: "deployment-key",
        title: "Deployment API key",
        meta: "API KEY / STAGING",
        description: "A sample credential for a fictional release workflow.",
      },
      {
        kind: "secret",
        id: "database-access",
        title: "Database access",
        meta: "DATABASE / PREVIEW",
        description: "A sample database credential kept with its project.",
      },
    ],
  },
  {
    id: "env",
    number: "02",
    label: ".env",
    caption: "Every variable in one private bundle.",
    records: [
      {
        kind: "env",
        id: "staging-env",
        title: ".env.staging",
        meta: "ENVIRONMENT / STAGING",
        variables: ["APP_ORIGIN", "FEATURE_MODE", "LOG_LEVEL"],
      },
      {
        kind: "env",
        id: "local-env",
        title: ".env.local",
        meta: "ENVIRONMENT / LOCAL",
        variables: ["APP_ORIGIN", "DEBUG_MODE", "CACHE_TTL"],
      },
    ],
  },
  {
    id: "notes",
    number: "03",
    label: "Notes",
    caption: "Keep private context beside the work.",
    records: [
      {
        kind: "note",
        id: "release-handoff",
        title: "Release handoff",
        meta: "NOTE / OPERATIONS",
        paragraphs: [
          "Confirm the staging smoke check before the release window.",
          "Keep the handoff details with the project, ready when the vault is unlocked.",
        ],
      },
      {
        kind: "note",
        id: "architecture-sketch",
        title: "Architecture sketch",
        meta: "NOTE / DESIGN",
        paragraphs: [
          "Capture the decisions that explain how this sample project fits together.",
          "A little context now saves another search later.",
        ],
      },
    ],
  },
  {
    id: "tasks",
    number: "04",
    label: "Tasks",
    caption: "Know what comes next.",
    records: [
      {
        kind: "task",
        id: "review-staging",
        title: "Review staging build",
        meta: "TASK / RELEASE",
        status: "IN PROGRESS",
        description: "Check the sample release flow and capture any follow-up work.",
      },
      {
        kind: "task",
        id: "prepare-notes",
        title: "Prepare release notes",
        meta: "TASK / WRITING",
        status: "PLANNED",
        description: "Write a short handoff for the next fictional milestone.",
      },
    ],
  },
];

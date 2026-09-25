---
version: 1
slug: "app-components-projects-project-env-workspace-tsx"
primary_target: "app/components/projects/project-env-workspace.tsx"
related_targets: ["app/components/projects/env-bundle-import-form.tsx","app/lib/workspace-file-import.ts"]
---

# Environment import review

Mode: Operate. This is a local extension of the existing project environment workspace for individual developers reviewing a selected `.env` file before local encryption.

## Direction contract

THESIS: Turn an opaque file import into a legible variable review without changing the whole-file encrypted storage model. The surface refuses a second raw textarea for imports.

OWN-WORLD: Inherit DevStash's compact terminal-vault interface, semantic cyan environment accent, native dialog behavior, existing form controls, and flat bordered panes in both themes.

STORY: The user selects a local file, sees which physical lines became variables or were skipped, corrects row-specific problems, controls value visibility, and explicitly creates one encrypted bundle.

FIRST VIEWPORT: Keep the modal identity and environment summary fixed above a dedicated row pane. Desktop rows use stable key/value/action columns with a sticky header; mobile rows become labeled stacked fields. Cancel and Create remain reachable in a sticky footer while only the variable pane scrolls.

FORM: Brief-pinned local extension, ranked first because the approved plan fully specifies the review interaction. Seed key: brief-pinned-env-import-review.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

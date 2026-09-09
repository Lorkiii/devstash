# Task categories plan

Status: design only. Do not implement this plan until the task encryption and
persistence phase is explicitly approved.

## Product behavior

- Provide built-in categories such as Work, Lifestyle, and Sports so a new
  vault has useful choices immediately.
- Let an authenticated, unlocked user create additional categories.
- Require a name and color when a custom category is created.
- Show the category as a compact colored badge in task lists, task details, and
  category filters.
- Let users rename, recolor, and delete their custom categories. Built-in
  categories remain available and keep stable identifiers.
- When a custom category is deleted, keep its tasks and move them to
  Uncategorized after explicit confirmation.

## Color system

- Offer a curated palette derived from the existing dark navy, blue, cyan,
  violet, emerald, amber, rose, and slate theme families.
- Store a stable palette token instead of accepting arbitrary CSS or raw style
  input. Resolve each token to theme-owned background, border, and foreground
  shades in the client.
- Preview the badge while choosing a color and require readable contrast in its
  default, hover, selected, and reduced-opacity states.
- Allow the same color on multiple categories; color is a visual aid and not a
  unique identifier.

## Security and future persistence

- Built-in category definitions may remain non-sensitive application constants.
- Treat custom category names and chosen color tokens as user-authored private
  data and include them in the client-encrypted category payload.
- A task may carry the category record ID as an approved relationship ID, but
  the server must never receive a plaintext category name, badge preview, or
  user-provided CSS value.
- Generate stable category and task IDs before encryption so their owner,
  relationship, entity type, and encryption version can be bound with
  authenticated additional data.
- Future category and task operations must authenticate the session, enforce
  ownership near the data layer, validate ciphertext envelopes, and return
  `Cache-Control: no-store`.

## Deferred implementation sequence

1. Approve the vault encryption profile and encrypted record envelope.
2. Define the encrypted category and task contracts with ownership constraints.
3. Add the curated theme palette and accessible badge component.
4. Add category selection and custom-category management to the task flow.
5. Add encrypted persistence, deletion reassignment, local filtering, and
   focused ownership, validation, encryption, and accessibility tests.

No Prisma model, migration, task type, mock data, component, or route is changed
by this plan.

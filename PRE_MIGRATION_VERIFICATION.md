# Pre-Migration Verification Report

Scope: fix all outstanding TypeScript errors and confirm a clean, stable baseline before any
auth/database/storage migration work begins. **No auth, database, or storage code was
touched.**

## Fixes applied

### Backend (`artifacts/api-server`)
- **`src/routes/inventory.ts`** — a route handler returned `res.json(...)` directly where the
  declared return type was `Promise<void>`. Changed to set the response then `return;`,
  matching the pattern used elsewhere in the file.
- **`src/routes/settings.ts`** — `req.params.key` was destructured as a bare identifier, which
  TypeScript widened to `string | string[]` and broke the Drizzle `eq()`/`insert().values()`
  calls. Fixed by reading `req.params.key` and asserting it as `string` (route params are
  always strings for this route pattern).
- **`src/routes/users.ts`** — the PATCH handler built an untyped `Record<string, unknown>` and
  force-cast it into Drizzle's `.set()`, which TypeScript correctly flagged as an unsafe
  conversion. Replaced with a properly typed `Partial<typeof usersTable.$inferInsert>` object
  so each field assignment is checked against the real column types.

### Frontend (`artifacts/solar-crm`)
These were not mentioned in the original audit but surfaced once `pnpm run typecheck` was run
against the full workspace; fixed for a genuinely clean baseline:
- **`src/components/layout.tsx`**, **`src/pages/leads/detail.tsx`**, **`src/pages/projects/detail.tsx`**,
  **`src/pages/system/index.tsx`** — several `useQuery`-based hooks (`useGetMe`,
  `useListLeadNotes`, `useGetLeadTimeline`, `useListPayments`, `useGetSystemHealth`) were
  called with query options but no `queryKey`, which the generated React Query types require
  once other options are present. Added the matching generated `getXQueryKey(...)` helper to
  each call.
- **`src/pages/activities/index.tsx`** — a hand-rolled inline SVG icon had a typo,
  `strokeLinelinejoin`, which isn't a valid SVG prop. Corrected to `strokeLinejoin`.
- **`src/pages/system/index.tsx`** — `createBackup.mutate({ data: {} }, ...)` passed a body to
  a mutation that takes no input (`void`). Changed to `createBackup.mutate(undefined, ...)`.

## Verification results

| Step | Result |
|---|---|
| `pnpm install` | ✅ Clean install, lockfile up to date, all 9 workspace packages resolved. |
| `pnpm run typecheck` | ✅ Zero errors across `api-server`, `solar-crm`, `mockup-sandbox`, `scripts`, and all `lib/*` packages. |
| Build — `api-server` | ✅ `node build.mjs` succeeds, emits `dist/index.mjs` and friends. |
| Build — `solar-crm` | ✅ `vite build` succeeds (2704 modules transformed, no errors). Requires the artifact's runtime `PORT`/`BASE_PATH`/`BASE_URL` env vars, which are supplied automatically by its workflow — verified directly by running the build with those set. |
| Build — `mockup-sandbox` | ⚠️ Same runtime env-var requirement as above; this is the pre-existing Canvas scaffold, untouched by the CRM migration and outside its scope. Not a regression. |
| Lint | ⚠️ Not applicable — this project has no ESLint (or other lint) configuration or `lint` script anywhere in the workspace. Nothing to run. |
| Workflows | ✅ `api-server` and `solar-crm` restarted and came up clean; `api-server` correctly returns 401 on protected routes (no DB configured yet, as expected). |

## Scope confirmation

- Auth code (`middlewares/jwtAuth.ts`, login/session logic) — **untouched**.
- Database code/schema (`lib/db/*`, Drizzle schema, migrations) — **untouched**. No
  `DATABASE_URL` was provisioned, no schema push or seed run.
- Storage code (local-disk document storage in `documents.ts`) — **untouched**.

The workspace now typechecks and builds cleanly end-to-end. This is a stable baseline —
migration work can proceed from here.

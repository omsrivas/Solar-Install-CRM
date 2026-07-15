# Repository Cleanup Report

Scope: this pass imported the SunPower Solar CRM (`omsrivas/Solar-Install-CRM`) into this
project as the `solar-crm` + `api-server` artifacts and applied the removals/fixes called out
in `REPOSITORY_AUDIT.md`. Per explicit instruction, **auth, database, and storage architecture
were not migrated or modified** — only Windows-installer cruft and dead/duplicate/unused code
were addressed.

## Removed / never imported

- **Windows on-prem installer package** — NSIS script (`setup.nsi`), `build-installer.bat`,
  PowerShell/Go installer code, `windows-deployment/`, `windows-dist/`, `.bmp`/`.ico` bundle
  assets, and the installer-build GitHub Actions workflow. These were **not brought into the
  workspace at all** during import (the safest form of removal) rather than copied then
  deleted. Verified: no `.nsi` files, no installer bitmaps, and no reference to
  `nsis` / `windows-deployment` / `build-installer` anywhere in the imported tree.
- **`cookie-parser`** and **`@types/cookie-parser`** — unused dependency in `api-server`
  (session auth uses `jsonwebtoken`/`bcryptjs`, never `cookie-parser`). Removed from
  `artifacts/api-server/package.json`.
- **`react-icons`** — unused dependency in `solar-crm` (icons come from `lucide-react`
  throughout). Removed from `artifacts/solar-crm/package.json`.
- **Direct `zod` dependency** in `solar-crm` — confirmed no direct `zod` imports in
  `artifacts/solar-crm/src`; it's only needed transitively (via `@workspace/api-zod` /
  `@hookform/resolvers`). Removed the direct entry.
- **`tailwindcss-animate`** in `artifacts/mockup-sandbox/package.json` — confirmed the CSS
  only imports `tw-animate-css`; `tailwindcss-animate` was unreferenced dead weight (this was
  already true in the pre-import scaffold, not just the donor repo).

## Dead code fixed in otherwise-legitimate files

- **`artifacts/api-server/src/app.ts`** — removed the unreachable "static file serving for
  production (Windows deployment)" block that served a bundled frontend from
  `dist/public/`. In this project the frontend is its own artifact (`solar-crm`) with its own
  dev server, so that code path could never execute. Replaced with a plain 404 for any
  non-`/api` route. Also dropped the now-unused `path`/`fs`/`fileURLToPath` imports.
- **`artifacts/api-server/src/routes/backup.ts`** — removed the `process.platform === "win32"`
  branches that pointed at `pg_dump.exe`/`psql.exe` under `C:\Program Files\PostgreSQL\16\bin`.
  Replit's runtime is always Linux, so these branches were dead; kept only the
  `pg_dump`/`psql` invocation.
- **`artifacts/api-server/src/routes/documents.ts`** — reworded a comment referencing
  "Windows deployment compatibility" for the local-disk document storage path. The storage
  *behavior* itself (local disk under `data/documents`) was intentionally left unchanged —
  storage migration is out of scope for this pass.

## Evaluated but intentionally left unchanged (per audit)

- **shadcn/radix `components/ui` duplication** between `mockup-sandbox` and `solar-crm` — this
  is the standard per-artifact scaffold convention in this monorepo, not accidental
  duplication. No action taken.
- **`formatBytes`/`formatUptime` duplication** between `backup.ts` and `system.ts` — minor,
  low-impact, left as-is.
- **`requireAuth`/`requireRole` duplication** in `jwtAuth.ts` — auth code is explicitly out of
  scope for this pass. No action taken.
- **Checked-in `lib/db/dist/` build output and `.tsbuildinfo` files** — already excluded going
  forward by `.gitignore`; not worth hand-removing existing copies this pass.
- **`scripts/src/hello.ts`** — flagged in the audit as a placeholder with no real consumer.
  Investigated removing it, but it's the standard `@workspace/scripts` package scaffold (not
  CRM-specific), and deleting it leaves `scripts/tsconfig.json`'s `include: ["src"]` with zero
  input files, which breaks `tsc` workspace-wide for no functional benefit. Kept in place.

## Known pre-existing issues (not part of this cleanup's scope)

`pnpm run typecheck` surfaces a handful of TypeScript errors in `api-server` that exist
unmodified in the donor repo (confirmed via diff — these files were copied byte-for-byte):

- `src/routes/inventory.ts` — a route handler returns `Response` where the declared return
  type is `void`.
- `src/routes/settings.ts` — a `key`/`value` typing mismatch against the generated Drizzle
  schema types on the settings upsert path.
- `src/routes/users.ts` — an unsafe cast from `Record<string, unknown>` to the Drizzle table
  type on the partial-update path.

These are application-logic bugs unrelated to Windows cruft, dead code, or unused
dependencies, and fixing them means changing real business logic in code paths adjacent to
auth/DB access. Since this pass is scoped to structural cleanup only, they're documented here
rather than fixed. Happy to address them in a follow-up if you'd like.

## Verification performed

- `pnpm install` completes cleanly across all 9 workspace packages.
- All three workflows (`api-server`, `solar-crm`, `mockup-sandbox`) start and serve without
  errors; `solar-crm`'s login page renders correctly against the live dev server.
- No database provisioning, schema push, or seeding was run — the API server boots but its
  `/api` routes will fail without a `DATABASE_URL`, which is expected at this stage since DB
  setup was explicitly excluded from this pass.

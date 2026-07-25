# Solar CRM — Hitech Electropower

A full-stack CRM for a solar installation business (India-specific: PMSGY scheme, DISCOM management, net metering). Tracks leads, projects, payments, inventory, service calls, and documents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (builds then starts on PORT env var, default 8080)
- `pnpm --filter @workspace/solar-crm run dev` — run the frontend (port 19465)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to Turso (dev only; requires TTY or use `--force` flag)
- `pnpm --filter @workspace/db run generate` — regenerate SQLite migrations from schema

## Required Secrets

| Secret | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | Turso libSQL URL (e.g. `libsql://your-db.turso.io`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK key JSON (backend) |
| `VITE_FIREBASE_API_KEY` | Firebase Web SDK — API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web SDK — auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Web SDK — project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Web SDK — storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web SDK — messaging sender |
| `VITE_FIREBASE_APP_ID` | Firebase Web SDK — app ID |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite, Wouter routing, Recharts, React Hook Form, TailwindCSS
- **Backend:** Express 5, Firebase Admin SDK (auth), Helmet, Multer (file uploads), express-rate-limit
- **Auth:** Firebase Authentication (email/password); frontend uses `onIdTokenChanged` + `browserLocalPersistence`
- **DB:** Turso (libSQL/SQLite) + Drizzle ORM
- **File storage:** Cloudflare R2 (S3-compatible) for documents
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build:** esbuild (bundles API server; `@libsql/client` and native binaries kept external)

## Where things live

| Path | Contents |
|---|---|
| `artifacts/solar-crm/` | React+Vite frontend |
| `artifacts/api-server/` | Express 5 API server |
| `lib/db/` | Drizzle schema, Turso client, query helpers |
| `lib/api-spec/openapi.yaml` | OpenAPI spec (source of truth for API contract) |
| `lib/api-client-react/` | Orval-generated React Query hooks + custom fetch |
| `lib/api-zod/` | Orval-generated Zod schemas |
| `artifacts/solar-crm/vendor/api-client-react/` | Vendored copy of api-client-react for the frontend |
| `lib/db/src/schema/crm.ts` | All CRM tables (leads, projects, payments, inventory, etc.) |
| `lib/db/src/schema/users.ts` | Users table (Firebase UID based) |

## Architecture decisions

- **Firebase UID as identity:** The users table links `firebase_uid` (from Firebase Auth) to internal DB rows. No passwords stored in DB.
- **esbuild externals:** `@libsql/client`, `@libsql/linux-x64-gnu`, and `libsql` are in the esbuild `external` array so native binaries are not bundled.
- **Vendored api-client-react:** The solar-crm frontend references `file:./vendor/api-client-react` instead of the workspace package, keeping the frontend fully self-contained.
- **Token store pattern:** `tokenStore.ts` caches the Firebase ID token and provides a getter wired into every API request via `setAuthTokenGetter` in the custom fetch layer.
- **drizzle-kit push workaround:** If `pnpm --filter @workspace/db run push` hangs on interactive prompt, run `drizzle-kit push --config ./drizzle.config.ts --force` directly from `lib/db/`.

## Product

- **Leads** — capture enquiries with source, system size, address, DISCOM info
- **Projects** — track installation progress (survey → sanction → installation → net metering)
- **Finance** — payment milestones, subsidy tracking (PMSGY), outstanding balances
- **Inventory** — panels, inverters, BOS materials with low-stock alerts
- **Service Calls** — AMC and breakdown service tracking
- **Documents** — upload/download project documents stored in Cloudflare R2
- **Reports** — revenue, lead conversion, project status analytics
- **Settings** — company info, tax rates, payment terms

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `drizzle-kit push --force` may still fail if a unique index exists in the schema but not in the live DB. Fix: create the index manually with `CREATE UNIQUE INDEX IF NOT EXISTS ... ON ...`, then re-run push.
- The API server build step bundles everything except libsql natives; always keep `@libsql/client` in the esbuild `external` array.
- Firebase ID tokens expire after 1 hour; the frontend uses `onIdTokenChanged` (not `onAuthStateChanged`) to auto-refresh them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

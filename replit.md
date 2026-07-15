# SunPower Solar CRM

A field operations and sales management CRM for solar installation companies. Tracks leads, projects, payments, inventory, and service calls across a team of sales reps, engineers, finance staff, and warehouse managers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/solar-crm run dev` — run the frontend (dynamic port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in localStorage as "solar_crm_token")
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle DB schema (users, leads, projects, payments, inventory, service_calls, activities, lead_notes, documents, settings)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/middlewares/jwtAuth.ts` — JWT auth middleware
- `artifacts/api-server/src/seed.ts` — seed script
- `artifacts/solar-crm/src/` — React frontend
- `artifacts/solar-crm/src/components/layout.tsx` — sidebar layout with auth guard
- `artifacts/solar-crm/src/Router.tsx` — all page routes

## Architecture decisions

- JWT auth (not Clerk). Token stored in localStorage as "solar_crm_token". `setAuthTokenGetter` called in `main.tsx`
- 401 from any API call → clear token → redirect to /login (handled in Layout via useEffect)
- Role guards applied at route prefix level in `routes/index.ts`
- All API hooks imported from `@workspace/api-client-react`, never relative paths
- Dark sidebar (#0f172a), amber primary (#f59e0b), white content area

## Product

- **Dashboard**: 8 KPI cards + recent activity feed
- **Leads**: Pipeline with stages (lead → tele_calling → site_visit → quotation_sent → negotiation → order_owned → allocated), follow-up tracking, convert to project
- **Projects**: Installation workflow (order_punched → survey_done → material_issued → installation_done → handover_done → completed)
- **Finance**: Payment records (advance/milestone/final), summaries
- **Inventory**: Stock management with low-stock alerts, transactions
- **Service**: Service call tracking with priority levels
- **Reports**: Leads, Sales, Finance, Service analytics with Recharts
- **Admin**: Users, Settings, System health

## Default Login Credentials

- Admin: admin@solarcrm.com / admin123
- Sales: ravi@solarcrm.com / sales123
- Engineer: priya@solarcrm.com / eng123
- Finance: anita@solarcrm.com / fin123
- Warehouse: suresh@solarcrm.com / wh123

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- `useToast` lives at `@/hooks/use-toast`, NOT `@/components/ui/toast`
- Mutations call `.mutate({ data: {...} })` not `.mutate({...})`
- Seed script must be run from workspace root: `/home/runner/workspace/node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/cli.mjs artifacts/api-server/src/seed.ts`
- Do NOT use `npx tsx` for seeding — it can't resolve workspace packages

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

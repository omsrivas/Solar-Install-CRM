---
name: Solar CRM Architecture
description: Key architectural decisions for the Solar CRM — auth, API client, monorepo structure, Windows deployment
---

## Auth
- JWT auth (NO Clerk). Token stored in localStorage as "solar_crm_token"
- `setAuthTokenGetter(() => localStorage.getItem("solar_crm_token"))` called in main.tsx at startup
- `generateToken` / `verifyToken` / `requireAuth` in `artifacts/api-server/src/middlewares/jwtAuth.ts`
- `JWT_SECRET` env var (falls back to hardcoded default for dev)
- 401 from any API call → Layout catches via useEffect on error → clear token → redirect to /login
- CRITICAL: use useEffect for redirect in Layout, NOT direct setLocation call during render

## API Client
- All hooks: `import { useXxx, setAuthTokenGetter } from "@workspace/api-client-react"`
- `useToast` lives at `@/hooks/use-toast`, NOT `@/components/ui/toast`
- Mutations call `.mutate({ data: {...} })` or `.mutateAsync({ data: {...} })`

## Backend Structure
- Routes in `artifacts/api-server/src/routes/` — one file per domain
- Role guards applied at route prefix level in `routes/index.ts`
- `requireAuth` / `requireRole` from `middlewares/jwtAuth.ts`
- In production, serves frontend static files from `dist/public/` (relative to bundle)
- `seed.ts` compiles to `dist/seed.mjs` as a separate esbuild entry — run it with node for seeding

## Frontend Pages
- 15+ pages: login, dashboard, leads, leads/:id, projects, projects/:id, finance, inventory, service, reports, activities, documents, users, settings, system
- All in `artifacts/solar-crm/src/pages/`
- Router at `artifacts/solar-crm/src/Router.tsx`
- Layout: dark sidebar (#0f172a), amber primary (#f59e0b), white content area
- Vite config requires PORT and BASE_PATH env vars even during `pnpm build` — pass PORT=1 BASE_PATH=/

## Windows Deployment Package
- All files in `windows-deployment/`
- Installer: `windows-deployment/installer/setup.nsi` (NSIS script → SolarCRM_Setup.exe)
- Build: `windows-deployment/build-package.sh` produces `windows-dist/SolarCRM-Windows-Package.zip`
- GitHub Actions: `.github/workflows/build-installer.yml` — push to main → .exe downloadable from Actions
- Schema SQL: `windows-deployment/installer/bundle/sql/0001_schema.sql` — run by installer via psql
- PowerShell scripts in `windows-deployment/scripts/` — all admin operations
- Caddy used for HTTPS reverse proxy (optional, internet access)
- NSSM used to install Node.js backend as Windows service

## Why
- JWT in localStorage: closed LAN app, not public web — acceptable tradeoff
- Static serving: backend (Express) serves built React frontend from `dist/public/` in production
- No drizzle-kit at runtime: installer uses raw SQL migration file + compiled seed.mjs via bundled Node.js

---
name: Solar CRM Seed Script
description: How to run the database seed script in this monorepo
---

## Seed Script Location
`artifacts/api-server/src/seed.ts`

## How to Run (from workspace root)
```bash
/home/runner/workspace/node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/cli.mjs artifacts/api-server/src/seed.ts
```

## Why This Path
- `tsx` is not in PATH directly
- `npx tsx` installs a fresh version that can't resolve workspace packages
- The pnpm-managed tsx binary CAN resolve @workspace/* packages because it shares node_modules context
- Running from workspace root so Node can find the workspace packages

## What Gets Seeded
- 5 users (admin, sales, engineer, finance, warehouse)
- 8 leads across all stages
- 5 projects across all stages
- 9 payments (mix of received/pending/overdue)
- 12 inventory items
- 4 service calls
- 5 activity log entries
- Default settings (company_name: "SunPower Solar")

## Default Login
admin@solarcrm.com / admin123

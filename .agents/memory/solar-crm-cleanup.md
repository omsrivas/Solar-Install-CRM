---
name: Solar CRM import & cleanup conventions
description: Policy for importing the Solar-Install-CRM donor repo and doing structural cleanup without touching auth/DB/storage.
---

## Windows-installer assets: exclude, don't import-then-delete
When porting a repo that bundles an on-prem Windows installer (NSIS scripts, PowerShell/Go
installer code, `windows-deployment/`, `.bmp`/`.ico` bundle assets, installer CI workflows),
the cleanest cleanup is to **never copy those paths into the workspace in the first place**
rather than importing everything and deleting afterward. Verify absence with a repo-wide grep
for `nsis|windows-deployment|windows-dist|build-installer` plus a find for `.nsi`/installer
bitmaps.
**Why:** avoids leaving traces in history/build caches and is strictly less work than
copy-then-delete.

## Porting real, already-built app code vs. fresh construction
When a user asks to import an existing, working codebase (not build something new), treat it
as a straight code migration: copy real source files, diff config against the scaffold
defaults, and adjust `package.json` deps — do **not** invoke the "always start with a design
subagent" build workflow that applies to greenfield UI work. That workflow is for new
construction, not porting.

## Windows-specific dead branches inside otherwise-legit files
Real app files can have dead Windows-only branches even though the file itself is legitimate
(e.g. `process.platform === "win32"` branches pointing at `pg_dump.exe`/`psql.exe`, or a
"serve frontend from dist/public for Windows deployment" static-file block in the API server
when the frontend is actually its own separate artifact/dev server in this project). Removing
these branches is safe structural cleanup, distinct from the auth/DB/storage architecture
itself, which should stay untouched if the user scoped a pass to "cleanup only."

## Pre-existing bugs found during cleanty typecheck
When cleanup surfaces `tsc` errors, diff the failing file against the untouched donor copy
before deciding to fix it. If byte-identical, it's a pre-existing app bug, not something the
cleanup pass introduced — document it in the cleanup report as a known issue rather than
silently fixing (fixing = business-logic change, outside a "structural cleanup only" scope) or
silently ignoring it.

# How to Build the SolarCRM Windows Installer
### Developer Guide — Produces `SolarCRM_Setup.exe`

---

## Overview

The installer build process runs on a **Windows machine** and produces `SolarCRM_Setup.exe`.
Once built, the `.exe` can be distributed to any non-technical user who just double-clicks it.

There are two ways to build:
1. **Local Windows build** — run `build-installer.bat` on your Windows PC
2. **GitHub Actions** — push to GitHub, the CI builds it automatically (recommended)

---

## Option 1 — Build Locally on Windows

### Prerequisites
Install these on your Windows development machine:

| Tool | Download |
|------|----------|
| Node.js 20 LTS | https://nodejs.org/ |
| pnpm | `npm install -g pnpm` |
| NSIS 3.x | https://nsis.sourceforge.io/Download |
| NSIS inetc plugin | https://nsis.sourceforge.io/Inetc_plug-in |
| Git | https://git-scm.com/ |

Add NSIS to PATH: `C:\Program Files (x86)\NSIS\`

### Build Steps

```cmd
REM 1. Clone / update the repository
git clone <your-repo-url>
cd solar-crm

REM 2. Install dependencies
pnpm install

REM 3. Run the installer builder
cd windows-deployment\installer
build-installer.bat
```

Output: `windows-deployment\installer\SolarCRM_Setup.exe`

---

## Option 2 — GitHub Actions (Recommended)

Push this repository to GitHub. The workflow at `.github/workflows/build-installer.yml`
automatically builds `SolarCRM_Setup.exe` on every push to `main`.

### Setup
1. Push the repository to GitHub
2. Go to **Actions** tab — builds start automatically
3. After a successful build, download `SolarCRM_Setup.exe` from the **Artifacts** section

The workflow:
- Runs on Windows Server 2022 runners (free on public repos)
- Builds frontend + backend
- Downloads Node.js portable and NSSM
- Compiles NSIS installer
- Uploads `SolarCRM_Setup.exe` as a downloadable artifact

---

## What Gets Bundled in the Installer

```
SolarCRM_Setup.exe
└── (self-extracting)
    ├── node\                    # Node.js 20 LTS portable (no install required)
    │   └── node.exe, npm, ...
    ├── tools\
    │   └── nssm.exe             # Non-Sucking Service Manager (~200 KB)
    ├── app\
    │   └── dist\
    │       ├── index.mjs        # Compiled Express backend
    │       ├── public\          # Built React frontend (served by backend)
    │       └── *.mjs            # Pino worker files
    ├── scripts\
    │   ├── Setup-Database.ps1
    │   ├── Install-Service.ps1
    │   ├── Configure-Firewall.ps1
    │   ├── Backup-Database.ps1
    │   ├── Restore-Database.ps1
    │   ├── Enable-HTTPS.ps1
    │   ├── Manage-Service.ps1
    │   └── Uninstall.ps1
    ├── config\
    │   └── solar-crm.env.template
    └── assets\
        ├── solar-crm.ico
        ├── license.txt
        ├── header.bmp
        └── welcome.bmp
```

**NOT bundled** (downloaded during install):
- PostgreSQL 16 installer (~300 MB) — downloaded from enterprisedb.com

---

## Customizing the Installer

### Branding
Place these files in `windows-deployment/installer/assets/`:
- `solar-crm.ico` — 256×256 ICO file for the app icon
- `header.bmp` — 150×57 pixels, shown in installer header
- `welcome.bmp` — 164×314 pixels, shown on welcome/finish pages

### Changing Defaults
Edit `windows-deployment/installer/setup.nsi`:
```nsis
!define APP_NAME     "SolarCRM"
!define APP_FULL_NAME "SunPower Solar CRM"
!define APP_VERSION  "1.0.0"
!define APP_PORT     "3000"
!define PUBLISHER    "SunPower Solar"
```

### Changing the DB password
Edit `setup.nsi` and `solar-crm.env.template` — change `SolarCRM_PgSuperPass_2024!` everywhere.

---

## Adding a Code Signature (Optional but Recommended)

A code signature prevents the "Unknown publisher" Windows warning.

1. Purchase a code signing certificate (~$100/year) from Sectigo, DigiCert, etc.
2. Sign the installer after building:
   ```cmd
   signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a SolarCRM_Setup.exe
   ```
3. For GitHub Actions, store the certificate as a repository secret.

Without a signature, users see "Windows protected your PC" — they must click **More info → Run anyway**.

---

## Release Checklist

Before distributing a new version:

- [ ] Update `APP_VERSION` in `setup.nsi`
- [ ] Update `APP_VERSION` in `package.json` files
- [ ] Run full test on a clean Windows VM
- [ ] Test upgrade path (install old → run new installer)
- [ ] Verify backup/restore works
- [ ] Update `INSTALL-GUIDE.md` if anything changed
- [ ] Tag the release in git: `git tag v1.0.0`

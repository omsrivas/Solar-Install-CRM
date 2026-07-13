# SolarCRM — Windows Server Deployment Package

Convert the SolarCRM web application into a self-contained Windows server installation.
A **non-technical business owner** runs `SolarCRM_Setup.exe` on one Windows PC
and the entire team immediately accesses the CRM from any browser on the network.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MASTER PC (Server)                      │
│                                                             │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────┐  │
│  │  PostgreSQL  │   │  Node.js App  │   │  Caddy HTTPS │  │
│  │  (port 5432) │◄──│  (port 3000)  │◄──│  (port 443)  │  │
│  │  Local only  │   │  API + React  │   │  Auto-SSL    │  │
│  └──────────────┘   └───────────────┘   └──────────────┘  │
│         ▲                                       ▲           │
└─────────┼───────────────────────────────────────┼───────────┘
          │ (internal)                             │ (LAN/Internet)
          │                              ┌─────────┴──────────┐
          │                              │  Any Browser       │
          │                              │  - LAN: http://IP  │
          │                              │  - Net: https://   │
          └──────────────────────────────┘   your-domain.com  │
                                         └────────────────────┘
```

**One server, all data in one place, access from anywhere.**

---

## Deployment Model

| Component | Location | Notes |
|-----------|----------|-------|
| PostgreSQL database | Master PC only | All business data lives here |
| Node.js backend (API) | Master PC only | Runs as Windows service |
| React frontend | Served by backend | No separate web server needed |
| HTTPS (Caddy) | Master PC only | Optional, for internet access |
| Backups | `C:\SolarCRM\backups\` | Daily automatic backups |

---

## Remote Access Options

| Method | Cost | Complexity | Best For |
|--------|------|-----------|---------|
| LAN (local network) | Free | None | Office-only use |
| DuckDNS + Caddy | Free | Low | Small businesses |
| No-IP + Caddy | Free/Paid | Low | Alternative to DuckDNS |
| Custom domain + Caddy | ~$10/yr domain | Low | Professional setup |

---

## Files in This Package

```
windows-deployment/
├── README.md                         # This file
├── INSTALL-GUIDE.md                  # For non-technical users running the installer
├── ADMIN-GUIDE.md                    # For the IT admin managing the installation
├── BUILD-INSTALLER.md                # For developers building SolarCRM_Setup.exe
│
├── installer/
│   ├── setup.nsi                     # NSIS installer script (compile → .exe)
│   ├── build-installer.bat           # Build script (run on Windows)
│   └── assets/                       # Installer graphics (place your icons here)
│
├── scripts/                          # PowerShell management scripts
│   ├── Setup-Database.ps1            # Create DB, apply schema, seed data
│   ├── Install-Service.ps1           # Register app as Windows service
│   ├── Configure-Firewall.ps1        # Open required ports
│   ├── Enable-HTTPS.ps1              # Set up Caddy + Let's Encrypt
│   ├── Backup-Database.ps1           # Create database backup
│   ├── Restore-Database.ps1          # Restore from backup
│   ├── Manage-Service.ps1            # Start / stop / restart / status / logs
│   └── Uninstall.ps1                 # Clean removal
│
└── config/
    ├── solar-crm.env.template        # Runtime configuration template
    ├── Caddyfile.template            # HTTPS proxy config template
    └── scheduled-backup.xml         # Task Scheduler XML for daily backups
```

---

## Quick Build Guide

### On Windows (local build)
```cmd
cd windows-deployment\installer
build-installer.bat
```
Output: `windows-deployment\installer\SolarCRM_Setup.exe`

### Via GitHub Actions (recommended)
Push to `main` → GitHub Actions automatically builds `SolarCRM_Setup.exe`
→ Download from the Actions tab → Artifacts

See `BUILD-INSTALLER.md` for full details.

---

## What the Installer Does (Automatic)

1. Downloads and installs **PostgreSQL 16** (if not already installed)
2. Creates the `solar_crm` database with proper permissions
3. Applies the database schema (all tables, indexes)
4. Seeds the database with demo data and default user accounts
5. Installs **Node.js 20** portable (bundled — no separate install)
6. Installs the SolarCRM backend as a **Windows service** (NSSM)
7. Configures **Windows Firewall** rules
8. Schedules **daily automatic backups** at 2:00 AM
9. Creates a **desktop shortcut** and Start menu entries
10. Starts SolarCRM and opens it in the browser

**Total install time: ~5–15 minutes** (mostly PostgreSQL download)

---

## Post-Install HTTPS Setup

For internet access with automatic SSL:
```powershell
# Run as Administrator on the server PC
C:\SolarCRM\scripts\Enable-HTTPS.ps1 -Domain yourcompany.duckdns.org
```

Then forward ports 80 and 443 from your router to the server PC.

---

## Default Credentials (change after install)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@solarcrm.com | admin123 |
| Sales | ravi@solarcrm.com | sales123 |
| Engineer | priya@solarcrm.com | eng123 |
| Finance | anita@solarcrm.com | fin123 |
| Warehouse | suresh@solarcrm.com | wh123 |

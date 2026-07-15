# SolarCRM Administrator Guide
### For SunPower Solar — System Administration

---

## File Locations

| Purpose | Path |
|---------|------|
| Installation directory | `C:\SolarCRM\` |
| Application files | `C:\SolarCRM\app\` |
| Configuration | `C:\SolarCRM\config\solar-crm.env` |
| Logs | `C:\SolarCRM\logs\` |
| Backups | `C:\SolarCRM\backups\` |
| Scripts | `C:\SolarCRM\scripts\` |
| Node.js runtime | `C:\SolarCRM\node\` |
| NSSM (service manager) | `C:\SolarCRM\tools\nssm.exe` |

---

## Managing the Service

All commands require **PowerShell as Administrator**.

```powershell
cd C:\SolarCRM\scripts

# Check status of all SolarCRM services
.\Manage-Service.ps1 -Action status

# Start services
.\Manage-Service.ps1 -Action start

# Stop services
.\Manage-Service.ps1 -Action stop

# Restart services (after config changes)
.\Manage-Service.ps1 -Action restart

# View recent logs
.\Manage-Service.ps1 -Action logs
```

You can also use the Windows Services Manager (`services.msc`) — look for **SolarCRM** and **SolarCRM-HTTPS**.

---

## Backup and Restore

### Create a Backup (Manual)
```powershell
cd C:\SolarCRM\scripts
.\Backup-Database.ps1
```
Backup files are saved to `C:\SolarCRM\backups\` as `.dump` files.

### Restore from Backup
```powershell
cd C:\SolarCRM\scripts
.\Restore-Database.ps1
# Script will list available backups and let you choose one
```

> **WARNING:** Restore overwrites all current data.

### Automatic Daily Backup
The installer configures a scheduled task that runs at **2:00 AM daily**.
It keeps the last **30 backups** (about 1 month of history).

To view or modify: Open **Task Scheduler** → `SolarCRM Daily Backup`

### Backup to External Location
To backup to a network share or USB drive:
```powershell
.\Backup-Database.ps1 -BackupDir "\\NAS\SolarCRM-Backups"
.\Backup-Database.ps1 -BackupDir "E:\Backups\SolarCRM"
```

---

## HTTPS / SSL Configuration

### Enable HTTPS with DuckDNS (recommended for internet access)
```powershell
cd C:\SolarCRM\scripts
.\Enable-HTTPS.ps1 -Domain yourcompany.duckdns.org
```
Caddy automatically obtains and renews a free Let's Encrypt certificate.

### Enable HTTPS for LAN only (self-signed cert)
```powershell
.\Enable-HTTPS.ps1
# No domain argument = self-signed cert for LAN
```
Users will see a browser warning on first visit — they click "Advanced → Proceed".

### Disable HTTPS
```powershell
Stop-Service SolarCRM-HTTPS
sc.exe delete SolarCRM-HTTPS
```

---

## User Management

Users are managed through the web interface:
1. Log in as admin
2. Go to **Users** in the sidebar
3. Create, edit, deactivate, or reset passwords

### Roles and Access
| Role | Leads | Projects | Finance | Inventory | Service | Users | Settings |
|------|-------|---------|---------|-----------|---------|-------|---------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| sales | ✓ | — | — | — | — | — | — |
| engineer | — | ✓ | — | — | ✓ | — | — |
| finance | — | — | ✓ | — | — | — | — |
| warehouse | — | — | — | ✓ | — | — | — |

---

## Configuration

Edit `C:\SolarCRM\config\solar-crm.env` then restart the service:

```ini
# Change the application port (default: 3000)
PORT=3000

# Change CORS origin restriction (use specific domain for HTTPS)
ALLOWED_ORIGIN=*
# OR for HTTPS:
ALLOWED_ORIGIN=https://yourcompany.duckdns.org
```

After editing, restart: `Restart-Service SolarCRM`

---

## Viewing Logs

```powershell
# Real-time log tail
Get-Content C:\SolarCRM\logs\solar-crm.log -Wait -Tail 50

# Last 100 lines
Get-Content C:\SolarCRM\logs\solar-crm.log -Tail 100

# Filter for errors only
Select-String -Path C:\SolarCRM\logs\solar-crm.log -Pattern "error|ERROR"

# HTTPS proxy logs (if Caddy enabled)
Get-Content C:\SolarCRM\logs\caddy-access.log -Tail 50
```

---

## Database Maintenance

Direct database access (for advanced users):
```powershell
# Open psql prompt
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U solar_crm_user -d solar_crm

# Run a specific query
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U solar_crm_user -d solar_crm -c "SELECT COUNT(*) FROM leads;"

# Vacuum the database (monthly maintenance)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d solar_crm -c "VACUUM ANALYZE;"
```

Set `PGPASSWORD=solar_crm_db_pass` before running psql commands.

---

## Upgrading SolarCRM

1. Back up the database first: `.\Backup-Database.ps1`
2. Stop the service: `Stop-Service SolarCRM`
3. Copy new `app\dist\*` files to `C:\SolarCRM\app\dist\`
4. If there are schema changes, run: `.\Setup-Database.ps1 -PgPassword "SolarCRM_PgSuperPass_2024!"`
5. Start the service: `Start-Service SolarCRM`

---

## Firewall Reference

| Port | Protocol | Purpose | External Access |
|------|----------|---------|----------------|
| 3000 | TCP | SolarCRM App Server | LAN (optional internet) |
| 80 | TCP | HTTP (Caddy redirect) | Required for HTTPS |
| 443 | TCP | HTTPS (Caddy proxy) | Required for HTTPS |
| 5432 | TCP | PostgreSQL | **Blocked — local only** |

---

## System Requirements — Production

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 100 GB (for backups) |
| OS | Windows 10 Pro | Windows Server 2022 |
| Network | 10 Mbps LAN | 100 Mbps LAN |

---

## Health Check API

The API exposes a health check endpoint:
```
GET http://localhost:3000/api/health
```
Returns database status, memory usage, uptime, and version.
The System page in the CRM UI shows this information visually.

---

## Support Checklist

Before contacting support, collect:
1. `C:\SolarCRM\logs\solar-crm.log` (last 200 lines)
2. `C:\SolarCRM\logs\solar-crm-error.log`
3. Output of: `Get-Service SolarCRM | Select-Object *`
4. Output of: `Invoke-WebRequest http://localhost:3000/api/health`

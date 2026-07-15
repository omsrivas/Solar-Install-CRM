# SolarCRM Installation Guide
### For SunPower Solar — Windows Server Setup

---

## What You Need

| Item | Details |
|------|---------|
| **Windows PC (Server)** | Windows 10/11 Pro or Windows Server 2019/2022 |
| **RAM** | Minimum 4 GB (8 GB recommended) |
| **Disk** | Minimum 10 GB free space |
| **Internet** | Required during installation only |
| **Installer file** | `SolarCRM_Setup.exe` |

> **The server PC must stay powered on** for other devices to access SolarCRM.
> It does not need to be a dedicated server — a regular Windows PC works fine.

---

## Installation Steps

### Step 1 — Run the Installer

1. Copy `SolarCRM_Setup.exe` to the server PC
2. Right-click → **Run as administrator**
3. If Windows shows a security warning, click **More info → Run anyway**

### Step 2 — Follow the Setup Wizard

The wizard will:
- Automatically download and install PostgreSQL (if not already installed)
- Install SolarCRM to `C:\SolarCRM\`
- Create and configure the database
- Install SolarCRM as a Windows service (starts automatically on boot)
- Open ports 3000 (and 80/443 if HTTPS is enabled) in Windows Firewall
- Create a desktop shortcut

> **This takes 5–15 minutes.** PostgreSQL download is ~300 MB.

### Step 3 — Verify Installation

When the wizard completes, it will offer to open SolarCRM in your browser.

- Open: **http://localhost:3000**
- Login: `admin@solarcrm.com` / `admin123`

**Change the admin password immediately after first login** via Settings → My Account.

---

## Accessing from Other Devices on Your Network

After installation, find the server PC's IP address:

1. On the server PC, open **Command Prompt**
2. Type `ipconfig` and press Enter
3. Note the **IPv4 Address** (e.g. `192.168.1.105`)

From any other device on the same Wi-Fi/network:
- Open a browser and go to: **http://192.168.1.105:3000**

> **Tip:** Set a static IP on the server PC so the address never changes.
> Go to Network Settings → Ethernet → Properties → Set static IP.

---

## Internet Access (Optional)

To access SolarCRM from outside your office:

### Option A — DuckDNS (Free Dynamic DNS)
1. Sign up at **https://www.duckdns.org/**
2. Create a free subdomain (e.g. `yourcompany.duckdns.org`)
3. Note your DuckDNS token
4. On the server PC, open PowerShell as Administrator and run:
   ```powershell
   cd C:\SolarCRM\scripts
   .\Enable-HTTPS.ps1 -Domain yourcompany.duckdns.org
   ```
5. In your router settings, forward ports **80** and **443** to the server PC's local IP

### Option B — Custom Domain
Same as Option A, but use your own domain name instead.

### Option C — No-IP
Same process, using your No-IP hostname instead of DuckDNS.

> **Router port forwarding** is required for internet access. Log in to your router
> (usually http://192.168.1.1) and add port forwarding rules for ports 80 and 443.

---

## After Installation — Verify Everything Works

| Check | How |
|-------|-----|
| Server running | Open http://localhost:3000 on server PC |
| LAN access | Open http://SERVER-IP:3000 from another device |
| Service auto-start | Restart the server PC and check it starts |
| Daily backup | Check `C:\SolarCRM\backups\` for backup files next day |

---

## Default User Accounts

| Role | Email | Password | Can Access |
|------|-------|----------|-----------|
| Admin | admin@solarcrm.com | admin123 | Everything |
| Sales | ravi@solarcrm.com | sales123 | Leads, Activities |
| Engineer | priya@solarcrm.com | eng123 | Projects, Service |
| Finance | anita@solarcrm.com | fin123 | Payments, Finance |
| Warehouse | suresh@solarcrm.com | wh123 | Inventory |

> **Change all passwords** after installation via the Users page (Admin only).

---

## Troubleshooting

### "Cannot connect to the page"
1. Check that the SolarCRM service is running:
   - Open PowerShell as Administrator
   - Run: `Get-Service SolarCRM`
   - Status should show `Running`
2. If stopped: `Start-Service SolarCRM`

### "Page loads but login fails"
- Verify you're using the correct email and password
- Check server logs: `C:\SolarCRM\logs\solar-crm.log`

### "Cannot access from other devices on the network"
1. Verify both devices are on the same network
2. Check that port 3000 is open: run `Configure-Firewall.ps1` again
3. Try temporarily disabling Windows Defender Firewall to test

### PostgreSQL fails to install
1. Ensure the server PC has internet access during installation
2. Download PostgreSQL manually from https://www.postgresql.org/download/windows/
3. Install with superuser password: `SolarCRM_PgSuperPass_2024!`
4. Then re-run `SolarCRM_Setup.exe`

---

## Uninstalling

1. Go to **Control Panel → Programs → Uninstall a program**
2. Find **SunPower Solar CRM** and click Uninstall
3. The wizard will ask if you want to keep your data (choose Yes to keep backups)

Or run as Administrator:
```powershell
C:\SolarCRM\scripts\Uninstall.ps1
```

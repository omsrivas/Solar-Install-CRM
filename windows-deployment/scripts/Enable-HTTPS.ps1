#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Enables HTTPS for SolarCRM using Caddy as a reverse proxy.
.DESCRIPTION
    Installs and configures Caddy web server to:
    - Automatically obtain a free Let's Encrypt SSL certificate
    - Proxy HTTPS traffic (port 443) to the SolarCRM backend (port 3000)
    - Redirect HTTP (port 80) to HTTPS
    
    For LAN-only use with a local IP, a self-signed certificate is used instead.
.PARAMETER Domain
    Your domain name (e.g. solar.yourbusiness.com or yourname.duckdns.org).
    For LAN-only, leave blank — a self-signed cert is generated.
.PARAMETER AppPort
    Port where SolarCRM backend is running. Default: 3000
.PARAMETER DuckDnsToken
    DuckDNS token if using DuckDNS for DNS challenge (for wildcard certs).
#>
param(
    [string]$Domain = "",
    [int]$AppPort = 3000,
    [string]$DuckDnsToken = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallDir  = "C:\SolarCRM"
$CaddyExe    = "$InstallDir\tools\caddy.exe"
$CaddyFile   = "$InstallDir\config\Caddyfile"
$CaddyData   = "$InstallDir\caddy-data"
$LogDir      = "$InstallDir\logs"
$NssmExe     = "$InstallDir\tools\nssm.exe"

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ERR $msg" -ForegroundColor Red; exit 1 }

Write-Host "`n  ==============================" -ForegroundColor Yellow
Write-Host "   SolarCRM HTTPS Setup (Caddy)" -ForegroundColor Yellow
Write-Host "  ==============================`n" -ForegroundColor Yellow

# ── Download Caddy if needed ───────────────────────────────────────────────────
if (-not (Test-Path $CaddyExe)) {
    Write-Step "Downloading Caddy web server"
    $caddyUrl = "https://github.com/caddyserver/caddy/releases/latest/download/caddy_windows_amd64.zip"
    $caddyZip = "$env:TEMP\caddy.zip"
    Invoke-WebRequest -Uri $caddyUrl -OutFile $caddyZip -UseBasicParsing
    Expand-Archive -Path $caddyZip -DestinationPath "$InstallDir\tools" -Force
    Remove-Item $caddyZip
    Write-OK "Caddy downloaded"
}

New-Item -ItemType Directory -Force -Path $CaddyData | Out-Null

# ── Generate Caddyfile ─────────────────────────────────────────────────────────
Write-Step "Writing Caddyfile"

if ($Domain) {
    # Public domain with automatic Let's Encrypt
    $caddyContent = @"
{
    storage file_system {
        root "$($CaddyData -replace '\\', '/')"
    }
}

$Domain {
    reverse_proxy localhost:$AppPort
    
    encode gzip
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        -Server
    }
    
    log {
        output file "$($LogDir -replace '\\', '/')/caddy-access.log" {
            roll_size 10MB
            roll_keep 5
        }
    }
}
"@
    Write-Host "  Domain: $Domain (Let's Encrypt SSL)" -ForegroundColor White
} else {
    # LAN-only with self-signed cert
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
    $caddyContent = @"
{
    local_certs
    storage file_system {
        root "$($CaddyData -replace '\\', '/')"
    }
}

:443 {
    tls internal
    reverse_proxy localhost:$AppPort
    encode gzip
    log {
        output file "$($LogDir -replace '\\', '/')/caddy-access.log" {
            roll_size 10MB
            roll_keep 5
        }
    }
}

:80 {
    redir https://{host}{uri} permanent
}
"@
    Write-Host "  No domain specified — using self-signed certificate for LAN access" -ForegroundColor Yellow
    Write-Host "  Your server IP: $LocalIP" -ForegroundColor White
    Write-Host "  Users will need to accept a browser security warning on first visit." -ForegroundColor Yellow
}

$caddyContent | Set-Content $CaddyFile -Encoding UTF8
Write-OK "Caddyfile written"

# ── Install Caddy as Windows service ──────────────────────────────────────────
Write-Step "Installing Caddy as Windows service"
$svcName = "SolarCRM-HTTPS"
$existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($existing) {
    Stop-Service -Name $svcName -ErrorAction SilentlyContinue
    & $NssmExe remove $svcName confirm 2>&1 | Out-Null
    Start-Sleep 1
}
& $NssmExe install $svcName $CaddyExe "run --config `"$CaddyFile`""
& $NssmExe set $svcName AppDirectory "$InstallDir"
& $NssmExe set $svcName DisplayName "SolarCRM HTTPS Proxy"
& $NssmExe set $svcName Description "Caddy HTTPS reverse proxy for SolarCRM"
& $NssmExe set $svcName Start SERVICE_AUTO_START
& $NssmExe set $svcName AppStdout "$LogDir\caddy.log"
& $NssmExe set $svcName AppStderr "$LogDir\caddy-error.log"
Start-Service -Name $svcName
Write-OK "Caddy service started"

# ── Configure firewall for 80/443 ─────────────────────────────────────────────
Write-Step "Opening ports 80 and 443 in firewall"
Remove-NetFirewallRule -DisplayName "SolarCRM - HTTP"  -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SolarCRM - HTTPS" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "SolarCRM - HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "SolarCRM - HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow | Out-Null
Write-OK "Ports 80 and 443 open"

Write-Host "`n  HTTPS enabled!" -ForegroundColor Green
if ($Domain) {
    Write-Host "  Access SolarCRM at: https://$Domain" -ForegroundColor White
    Write-Host "  SSL certificate will be obtained automatically from Let's Encrypt." -ForegroundColor Yellow
    Write-Host "  NOTE: Your router must forward ports 80 and 443 to this PC." -ForegroundColor Yellow
} else {
    Write-Host "  Access SolarCRM at: https://$LocalIP (LAN only)" -ForegroundColor White
    Write-Host "  NOTE: Users will see a browser security warning — click Advanced > Proceed." -ForegroundColor Yellow
}
Write-Host ""

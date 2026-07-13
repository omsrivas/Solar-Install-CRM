#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs the SolarCRM backend as a Windows service using NSSM.
.DESCRIPTION
    Uses NSSM (Non-Sucking Service Manager) to install and configure
    the Node.js backend as a Windows service that starts automatically on boot.
#>
param(
    [string]$InstallDir = "C:\SolarCRM",
    [int]$Port = 3000,
    [switch]$Reinstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServiceName = "SolarCRM"
$NssmExe     = "$InstallDir\tools\nssm.exe"
$NodeExe     = "$InstallDir\node\node.exe"
$AppScript   = "$InstallDir\app\dist\index.mjs"
$ConfigFile  = "$InstallDir\config\solar-crm.env"
$LogDir      = "$InstallDir\logs"

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ERR $msg" -ForegroundColor Red; exit 1 }

function Read-Env([string]$key, [string]$default = "") {
    if (Test-Path $ConfigFile) {
        $line = Get-Content $ConfigFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1].Trim() }
    }
    return $default
}

# ── Preflight ──────────────────────────────────────────────────────────────────
Write-Host "`n  ==============================" -ForegroundColor Yellow
Write-Host "   SolarCRM Service Installer" -ForegroundColor Yellow
Write-Host "  ==============================`n" -ForegroundColor Yellow

if (-not (Test-Path $NssmExe)) { Write-Fail "NSSM not found at $NssmExe" }
if (-not (Test-Path $NodeExe)) { Write-Fail "Node.js not found at $NodeExe" }
if (-not (Test-Path $AppScript)) { Write-Fail "App not built. Run build-package.bat first." }

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ── Remove existing service ────────────────────────────────────────────────────
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    if (-not $Reinstall) {
        Write-Host "  Service '$ServiceName' already exists. Use -Reinstall to replace it." -ForegroundColor Yellow
        exit 0
    }
    Write-Step "Stopping and removing existing service"
    & $NssmExe stop $ServiceName 2>&1 | Out-Null
    Start-Sleep 2
    & $NssmExe remove $ServiceName confirm 2>&1 | Out-Null
    Start-Sleep 1
    Write-OK "Existing service removed"
}

# ── Load environment values ────────────────────────────────────────────────────
$DatabaseUrl = Read-Env "DATABASE_URL" "postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm"
$JwtSecret   = Read-Env "JWT_SECRET" ([System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48)))
$AppPort     = Read-Env "PORT" "$Port"

# Save generated JWT_SECRET back if it wasn't set
if (-not (Read-Env "JWT_SECRET")) {
    Add-Content $ConfigFile "JWT_SECRET=$JwtSecret"
}

# ── Install service ────────────────────────────────────────────────────────────
Write-Step "Installing '$ServiceName' Windows service"

& $NssmExe install $ServiceName $NodeExe "--enable-source-maps `"$AppScript`""
& $NssmExe set $ServiceName AppDirectory "$InstallDir\app"
& $NssmExe set $ServiceName AppEnvironmentExtra `
    "NODE_ENV=production" `
    "PORT=$AppPort" `
    "DATABASE_URL=$DatabaseUrl" `
    "JWT_SECRET=$JwtSecret" `
    "ALLOWED_ORIGIN=*"
& $NssmExe set $ServiceName DisplayName "SolarCRM Server"
& $NssmExe set $ServiceName Description "SolarCRM backend API and web server for SunPower Solar"
& $NssmExe set $ServiceName Start SERVICE_AUTO_START
& $NssmExe set $ServiceName AppStdout "$LogDir\solar-crm.log"
& $NssmExe set $ServiceName AppStderr "$LogDir\solar-crm-error.log"
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName AppRotateBytes 10485760
& $NssmExe set $ServiceName AppStopMethodSkip 0
& $NssmExe set $ServiceName AppKillProcessTree 1
& $NssmExe set $ServiceName DependOnService postgresql-x64-16

Write-OK "Service installed"

# ── Start service ──────────────────────────────────────────────────────────────
Write-Step "Starting service"
Start-Service -Name $ServiceName
Start-Sleep 3
$svc = Get-Service -Name $ServiceName
if ($svc.Status -eq "Running") {
    Write-OK "Service is running"
} else {
    Write-Fail "Service failed to start. Check logs at $LogDir"
}

Write-Host "`n  SolarCRM service installed and started!" -ForegroundColor Green
Write-Host "  Access the app at: http://localhost:$AppPort`n" -ForegroundColor White

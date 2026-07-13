#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Completely removes SolarCRM from Windows.
.DESCRIPTION
    Stops services, removes services, removes firewall rules, and optionally
    deletes the installation directory and database.
.PARAMETER KeepData
    If specified, preserves the database and config (C:\SolarCRM\backups and config).
#>
param([switch]$KeepData)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallDir  = "C:\SolarCRM"
$NssmExe     = "$InstallDir\tools\nssm.exe"
$Services    = @("SolarCRM", "SolarCRM-HTTPS")

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }

Write-Host "`n  ==============================" -ForegroundColor Red
Write-Host "   SolarCRM Uninstaller" -ForegroundColor Red
Write-Host "  ==============================" -ForegroundColor Red

if (-not $KeepData) {
    Write-Host "`n  WARNING: This will delete ALL SolarCRM data including the database!" -ForegroundColor Red
    $confirm = Read-Host "  Type 'DELETE' to confirm"
    if ($confirm -ne "DELETE") { Write-Host "  Aborted."; exit 0 }
}

# ── Stop and remove services ───────────────────────────────────────────────────
Write-Step "Stopping services"
$Services | ForEach-Object {
    $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
    if ($svc) {
        Stop-Service -Name $_ -Force -ErrorAction SilentlyContinue
        Start-Sleep 1
        if (Test-Path $NssmExe) {
            & $NssmExe remove $_ confirm 2>&1 | Out-Null
        } else {
            sc.exe delete $_ | Out-Null
        }
        Write-OK "Removed service: $_"
    }
}

# ── Remove firewall rules ──────────────────────────────────────────────────────
Write-Step "Removing firewall rules"
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "SolarCRM*" } | ForEach-Object {
    Remove-NetFirewallRule -Name $_.Name
    Write-OK "Removed: $($_.DisplayName)"
}

# ── Remove desktop shortcut ────────────────────────────────────────────────────
$shortcuts = @(
    [Environment]::GetFolderPath("CommonDesktopDirectory") + "\SolarCRM.lnk",
    [Environment]::GetFolderPath("Desktop") + "\SolarCRM.lnk"
)
$shortcuts | Where-Object { Test-Path $_ } | ForEach-Object {
    Remove-Item $_ -Force
    Write-OK "Removed shortcut: $_"
}

# ── Remove start menu ──────────────────────────────────────────────────────────
$startMenu = [Environment]::GetFolderPath("CommonPrograms") + "\SolarCRM"
if (Test-Path $startMenu) {
    Remove-Item $startMenu -Recurse -Force
    Write-OK "Removed start menu entries"
}

# ── Remove installation directory ──────────────────────────────────────────────
if (-not $KeepData) {
    Write-Step "Removing installation directory"
    if (Test-Path $InstallDir) {
        Remove-Item $InstallDir -Recurse -Force
        Write-OK "Removed $InstallDir"
    }

    # Optionally drop database
    $pgDrop = Read-Host "`n  Also drop the 'solar_crm' PostgreSQL database? (yes/no)"
    if ($pgDrop -eq "yes") {
        $PsqlExe = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
        if (-not $PsqlExe) {
            $PgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue |
                     Sort-Object FullName -Descending | Select-Object -First 1
            if ($PgBin) { $PsqlExe = $PgBin.FullName }
        }
        if ($PsqlExe) {
            $env:PGPASSWORD = Read-Host "  Enter PostgreSQL 'postgres' user password"
            & $PsqlExe -U postgres -c "DROP DATABASE IF EXISTS solar_crm;" 2>&1
            & $PsqlExe -U postgres -c "DROP USER IF EXISTS solar_crm_user;" 2>&1
            Write-OK "Database dropped"
        }
    }
} else {
    # Keep data: only remove app files, not backups/config
    Write-Step "Removing app files (keeping data)"
    @("app", "node", "tools") | ForEach-Object {
        $dir = "$InstallDir\$_"
        if (Test-Path $dir) { Remove-Item $dir -Recurse -Force; Write-OK "Removed: $dir" }
    }
}

Write-Host "`n  SolarCRM has been uninstalled.`n" -ForegroundColor Green

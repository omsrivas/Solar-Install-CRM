#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Restores the SolarCRM database from a backup file.
.DESCRIPTION
    Uses pg_restore to restore a backup created by Backup-Database.ps1.
    WARNING: This will OVERWRITE the current database.
.PARAMETER BackupFile
    Path to the .dump backup file. If omitted, lists available backups and prompts.
.PARAMETER Force
    Skip confirmation prompt.
#>
param(
    [string]$BackupFile = "",
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallDir = "C:\SolarCRM"
$BackupDir  = "$InstallDir\backups"
$ConfigFile = "$InstallDir\config\solar-crm.env"
$ServiceName = "SolarCRM"

function Read-Env([string]$key, [string]$default = "") {
    if (Test-Path $ConfigFile) {
        $line = Get-Content $ConfigFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1].Trim() }
    }
    return $default
}

# ── Resolve pg_restore ─────────────────────────────────────────────────────────
$PgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue)?.Source
if (-not $PgRestore) {
    $PgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "pg_restore.exe" -Recurse -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($PgBin) { $PgRestore = $PgBin.FullName }
}
if (-not $PgRestore) { throw "pg_restore.exe not found. Is PostgreSQL installed?" }

# ── Pick backup file ───────────────────────────────────────────────────────────
if (-not $BackupFile) {
    $backups = Get-ChildItem $BackupDir -Filter "solar_crm_*.dump" | Sort-Object LastWriteTime -Descending
    if (-not $backups) { throw "No backups found in $BackupDir" }

    Write-Host "`n  Available backups:" -ForegroundColor Cyan
    $i = 1
    $backups | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  [$i] $($_.Name)  ($sizeMB MB  $($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"
        $i++
    }
    $choice = Read-Host "`n  Enter backup number (1-$($backups.Count))"
    $BackupFile = $backups[$choice - 1].FullName
}

if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }

# ── Confirmation ───────────────────────────────────────────────────────────────
if (-not $Force) {
    Write-Host "`n  WARNING: This will OVERWRITE the current database!" -ForegroundColor Red
    Write-Host "  Backup to restore: $BackupFile" -ForegroundColor Yellow
    $confirm = Read-Host "  Type 'yes' to continue"
    if ($confirm -ne "yes") { Write-Host "  Aborted."; exit 0 }
}

# ── Parse connection ───────────────────────────────────────────────────────────
$DatabaseUrl = Read-Env "DATABASE_URL" "postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm"
$uri = [System.Uri]$DatabaseUrl
$env:PGPASSWORD = $uri.UserInfo.Split(":")[1]
$DbName = $uri.AbsolutePath.TrimStart("/")
$DbHost = $uri.Host
$DbPort = $uri.Port
$DbUser = $uri.UserInfo.Split(":")[0]

# ── Stop service before restore ────────────────────────────────────────────────
Write-Host "`n  Stopping SolarCRM service..." -ForegroundColor Yellow
Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
Start-Sleep 2

try {
    # ── Drop and recreate database ─────────────────────────────────────────────
    Write-Host "  Dropping existing database..." -ForegroundColor Yellow
    $PsqlExe = $PgRestore -replace "pg_restore\.exe$", "psql.exe"
    & $PsqlExe -h $DbHost -p $DbPort -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null
    & $PsqlExe -h $DbHost -p $DbPort -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>&1 | Out-Null

    # ── Restore ────────────────────────────────────────────────────────────────
    Write-Host "  Restoring from backup..." -ForegroundColor Cyan
    & $PgRestore `
        -h $DbHost `
        -p $DbPort `
        -U $DbUser `
        -d $DbName `
        -F custom `
        --no-owner `
        --no-privileges `
        $BackupFile

    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }

    Write-Host "  Restore complete!" -ForegroundColor Green
} finally {
    # ── Always restart service ─────────────────────────────────────────────────
    Write-Host "  Restarting SolarCRM service..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    Write-Host "  Service restarted.`n" -ForegroundColor Green
}

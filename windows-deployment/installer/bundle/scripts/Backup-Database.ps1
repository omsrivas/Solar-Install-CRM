#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates a full backup of the SolarCRM database.
.DESCRIPTION
    Uses pg_dump to create a compressed backup. Automatically rotates old backups
    keeping only the last N backups. Can be scheduled via Task Scheduler.
.PARAMETER BackupDir
    Directory to store backups. Default: C:\SolarCRM\backups
.PARAMETER Keep
    Number of backups to retain. Default: 30
#>
param(
    [string]$BackupDir = "C:\SolarCRM\backups",
    [int]$Keep = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallDir = "C:\SolarCRM"
$ConfigFile = "$InstallDir\config\solar-crm.env"

function Read-Env([string]$key, [string]$default = "") {
    if (Test-Path $ConfigFile) {
        $line = Get-Content $ConfigFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1].Trim() }
    }
    return $default
}

# ── Resolve pg_dump ────────────────────────────────────────────────────────────
$PgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue)?.Source
if (-not $PgDump) {
    $PgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($PgBin) { $PgDump = $PgBin.FullName }
}
if (-not $PgDump) { throw "pg_dump.exe not found. Is PostgreSQL installed?" }

# ── Setup ──────────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$DatabaseUrl = Read-Env "DATABASE_URL" "postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm"
$uri = [System.Uri]$DatabaseUrl
$env:PGPASSWORD = $uri.UserInfo.Split(":")[1]
$DbName = $uri.AbsolutePath.TrimStart("/")
$DbHost = $uri.Host
$DbPort = $uri.Port
$DbUser = $uri.UserInfo.Split(":")[0]

$Timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = "$BackupDir\solar_crm_$Timestamp.dump"
$MetaFile   = "$BackupDir\solar_crm_$Timestamp.meta.json"

Write-Host "`n  Creating backup: $BackupFile" -ForegroundColor Cyan

# ── Run pg_dump ────────────────────────────────────────────────────────────────
& $PgDump `
    -h $DbHost `
    -p $DbPort `
    -U $DbUser `
    -d $DbName `
    -F custom `
    -Z 9 `
    -f $BackupFile

if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

# ── Write metadata ─────────────────────────────────────────────────────────────
$meta = @{
    timestamp    = (Get-Date -Format "o")
    database     = $DbName
    file         = $BackupFile
    size_bytes   = (Get-Item $BackupFile).Length
    solar_crm_version = (Read-Env "APP_VERSION" "1.0.0")
} | ConvertTo-Json
$meta | Set-Content $MetaFile

$SizeMB = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
Write-Host "  Backup complete: $SizeMB MB" -ForegroundColor Green

# ── Rotate old backups ─────────────────────────────────────────────────────────
$allBackups = Get-ChildItem $BackupDir -Filter "solar_crm_*.dump" | Sort-Object LastWriteTime -Descending
$toDelete = $allBackups | Select-Object -Skip $Keep
if ($toDelete) {
    Write-Host "  Rotating old backups (keeping last $Keep)..." -ForegroundColor Yellow
    $toDelete | ForEach-Object {
        Remove-Item $_.FullName -Force
        $metaToDelete = $_.FullName -replace "\.dump$", ".meta.json"
        if (Test-Path $metaToDelete) { Remove-Item $metaToDelete -Force }
        Write-Host "  Deleted: $($_.Name)" -ForegroundColor Gray
    }
}

Write-Host "  Backup saved to: $BackupFile`n" -ForegroundColor Green

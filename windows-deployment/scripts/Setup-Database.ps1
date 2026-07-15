#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Sets up the PostgreSQL database for SolarCRM.
.DESCRIPTION
    Creates the solar_crm database, runs schema migrations, and optionally seeds demo data.
    Run this script once during initial installation or to reset the database.
.PARAMETER PgPassword
    PostgreSQL superuser (postgres) password. Default: read from config.
.PARAMETER Seed
    If specified, seeds the database with demo data.
.PARAMETER Reset
    If specified, drops and recreates the database (WARNING: destroys all data).
#>
param(
    [string]$PgPassword = "",
    [switch]$Seed,
    [switch]$Reset
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configuration ──────────────────────────────────────────────────────────────
$InstallDir   = "C:\SolarCRM"
$ConfigFile   = "$InstallDir\config\solar-crm.env"
$NodeExe      = "$InstallDir\node\node.exe"
$PsqlExe      = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
if (-not $PsqlExe) {
    $PgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($PgBin) { $PsqlExe = Join-Path $PgBin.FullName "psql.exe" }
}

function Read-Config {
    $cfg = @{}
    if (Test-Path $ConfigFile) {
        Get-Content $ConfigFile | ForEach-Object {
            if ($_ -match "^([^#=]+)=(.*)$") { $cfg[$Matches[1].Trim()] = $Matches[2].Trim() }
        }
    }
    return $cfg
}

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ERR $msg" -ForegroundColor Red; exit 1 }

# ── Load config ────────────────────────────────────────────────────────────────
$cfg = Read-Config
if (-not $PgPassword) { $PgPassword = $cfg["PG_PASSWORD"] ?? "solarcrm_pg_pass" }
$DbName = $cfg["DB_NAME"] ?? "solar_crm"
$DbUser = $cfg["DB_USER"] ?? "solar_crm_user"
$DbPass = $cfg["DB_PASS"] ?? "solar_crm_db_pass"

$env:PGPASSWORD = $PgPassword

Write-Host "`n  ==============================" -ForegroundColor Yellow
Write-Host "   SolarCRM Database Setup" -ForegroundColor Yellow
Write-Host "  ==============================`n" -ForegroundColor Yellow

# ── Check psql ─────────────────────────────────────────────────────────────────
if (-not $PsqlExe -or -not (Test-Path $PsqlExe)) {
    Write-Fail "psql.exe not found. Make sure PostgreSQL is installed and in PATH."
}
Write-OK "Found psql: $PsqlExe"

# ── Reset (optional) ───────────────────────────────────────────────────────────
if ($Reset) {
    Write-Step "Dropping existing database '$DbName' (Reset mode)"
    & $PsqlExe -U postgres -c "DROP DATABASE IF EXISTS $DbName;" 2>&1
    & $PsqlExe -U postgres -c "DROP USER IF EXISTS $DbUser;" 2>&1
    Write-OK "Dropped database and user"
}

# ── Create user and database ───────────────────────────────────────────────────
Write-Step "Creating database user '$DbUser'"
& $PsqlExe -U postgres -c @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DbUser') THEN
    CREATE USER $DbUser WITH PASSWORD '$DbPass';
  END IF;
END
`$`$;
"@ 2>&1 | Out-Null
Write-OK "User '$DbUser' ready"

Write-Step "Creating database '$DbName'"
$exists = & $PsqlExe -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';" 2>&1
if ($exists -ne "1") {
    & $PsqlExe -U postgres -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>&1 | Out-Null
    Write-OK "Database '$DbName' created"
} else {
    Write-OK "Database '$DbName' already exists — skipping creation"
}

& $PsqlExe -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;" 2>&1 | Out-Null

# ── Build connection string ────────────────────────────────────────────────────
$DatabaseUrl = "postgresql://${DbUser}:${DbPass}@localhost:5432/${DbName}"

# ── Apply schema (run SQL migration files bundled with installer) ──────────────
Write-Step "Applying database schema"
$env:DATABASE_URL = $DatabaseUrl
$env:PGPASSWORD = $DbPass
$SqlDir = "$InstallDir\sql"
if (Test-Path $SqlDir) {
    $sqlFiles = Get-ChildItem $SqlDir -Filter "*.sql" | Sort-Object Name
    foreach ($sql in $sqlFiles) {
        Write-Host "  Applying: $($sql.Name)"
        & $PsqlExe -h localhost -p 5432 -U $DbUser -d $DbName -f $sql.FullName 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Fail "Schema migration failed: $($sql.Name)" }
    }
} else {
    Write-Host "  No SQL migration files found at $SqlDir — skipping schema apply"
}
Write-OK "Schema applied"

# ── Seed (optional) ────────────────────────────────────────────────────────────
if ($Seed) {
    Write-Step "Seeding database with demo data"
    $env:DATABASE_URL = $DatabaseUrl
    & $NodeExe "--enable-source-maps" "$InstallDir\app\dist\seed.mjs" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Fail "Seed failed" }
    Write-OK "Database seeded"
    Write-Host "`n  Default logins:" -ForegroundColor Yellow
    Write-Host "    Admin:     admin@solarcrm.com / admin123" -ForegroundColor White
    Write-Host "    Sales:     ravi@solarcrm.com  / sales123" -ForegroundColor White
    Write-Host "    Engineer:  priya@solarcrm.com / eng123" -ForegroundColor White
    Write-Host "    Finance:   anita@solarcrm.com / fin123" -ForegroundColor White
    Write-Host "    Warehouse: suresh@solarcrm.com / wh123`n" -ForegroundColor White
}

# ── Update config with DATABASE_URL ────────────────────────────────────────────
Write-Step "Saving DATABASE_URL to config"
$lines = if (Test-Path $ConfigFile) { Get-Content $ConfigFile } else { @() }
$lines = $lines | Where-Object { $_ -notmatch "^DATABASE_URL=" }
$lines += "DATABASE_URL=$DatabaseUrl"
$lines | Set-Content $ConfigFile
Write-OK "Config updated"

Write-Host "`n  Database setup complete!" -ForegroundColor Green

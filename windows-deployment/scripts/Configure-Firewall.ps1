#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Configures Windows Firewall rules for SolarCRM.
.DESCRIPTION
    Opens ports 80 (HTTP), 443 (HTTPS), and 3000 (app server) for inbound connections.
    Also configures PostgreSQL port (5432) as local-only.
#>
param(
    [int]$AppPort   = 3000,
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }

$rules = @(
    @{ Name = "SolarCRM - App Server";  Port = $AppPort; Protocol = "TCP"; Profile = "Any" },
    @{ Name = "SolarCRM - HTTP";        Port = 80;        Protocol = "TCP"; Profile = "Any" },
    @{ Name = "SolarCRM - HTTPS";       Port = 443;       Protocol = "TCP"; Profile = "Any" }
)

if ($Remove) {
    Write-Host "`n  Removing SolarCRM firewall rules..." -ForegroundColor Yellow
    $rules | ForEach-Object {
        Remove-NetFirewallRule -DisplayName $_.Name -ErrorAction SilentlyContinue
        Write-OK "Removed: $($_.Name)"
    }
    # Keep PostgreSQL blocked externally (don't open it)
    Write-Host "`n  Firewall rules removed.`n" -ForegroundColor Green
    exit 0
}

Write-Host "`n  ==============================" -ForegroundColor Yellow
Write-Host "   SolarCRM Firewall Setup" -ForegroundColor Yellow
Write-Host "  ==============================`n" -ForegroundColor Yellow

$rules | ForEach-Object {
    Write-Step "Opening port $($_.Port) ($($_.Name))"
    # Remove old rule if exists
    Remove-NetFirewallRule -DisplayName $_.Name -ErrorAction SilentlyContinue
    # Add new rule
    New-NetFirewallRule `
        -DisplayName $_.Name `
        -Direction Inbound `
        -Protocol $_.Protocol `
        -LocalPort $_.Port `
        -Action Allow `
        -Profile $_.Profile `
        -Description "SolarCRM - created by installer" | Out-Null
    Write-OK "Port $($_.Port) open"
}

# Ensure PostgreSQL port is NOT open to external networks
Write-Step "Ensuring PostgreSQL (5432) is blocked externally"
Remove-NetFirewallRule -DisplayName "SolarCRM - PostgreSQL" -ErrorAction SilentlyContinue
New-NetFirewallRule `
    -DisplayName "SolarCRM - PostgreSQL Block" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5432 `
    -Action Block `
    -RemoteAddress "0.0.0.0/0" `
    -Profile Any `
    -Description "Block external access to PostgreSQL" | Out-Null
Write-OK "PostgreSQL blocked on external networks"

Write-Host "`n  Firewall configured successfully!" -ForegroundColor Green
Write-Host "  Ports open: 80 (HTTP), 443 (HTTPS), $AppPort (App)`n" -ForegroundColor White

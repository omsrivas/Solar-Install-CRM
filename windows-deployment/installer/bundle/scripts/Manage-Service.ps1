#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Start, stop, restart, or check the status of SolarCRM services.
.PARAMETER Action
    start | stop | restart | status | logs
#>
param(
    [ValidateSet("start","stop","restart","status","logs")]
    [string]$Action = "status"
)

$Services = @("SolarCRM", "SolarCRM-HTTPS")
$LogDir   = "C:\SolarCRM\logs"

function Show-Status {
    Write-Host "`n  SolarCRM Services Status" -ForegroundColor Cyan
    Write-Host "  " + "─" * 40
    $Services | ForEach-Object {
        $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
        if ($svc) {
            $color = if ($svc.Status -eq "Running") { "Green" } else { "Red" }
            Write-Host ("  {0,-25} " -f $_) -NoNewline
            Write-Host $svc.Status -ForegroundColor $color
        } else {
            Write-Host ("  {0,-25} " -f $_) -NoNewline
            Write-Host "Not installed" -ForegroundColor Gray
        }
    }

    # PostgreSQL
    $pg = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1
    if ($pg) {
        $color = if ($pg.Status -eq "Running") { "Green" } else { "Red" }
        Write-Host ("  {0,-25} " -f "PostgreSQL") -NoNewline
        Write-Host $pg.Status -ForegroundColor $color
    }

    # Connectivity check
    Write-Host "`n  Connectivity:" -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 3 -UseBasicParsing
        Write-Host "  API health check         " -NoNewline
        Write-Host "OK (HTTP $($resp.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  API health check         " -NoNewline
        Write-Host "FAILED - server may be starting" -ForegroundColor Red
    }
    Write-Host ""
}

switch ($Action) {
    "start" {
        Write-Host "  Starting SolarCRM services..." -ForegroundColor Cyan
        $Services | ForEach-Object {
            $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
            if ($svc -and $svc.Status -ne "Running") {
                Start-Service -Name $_
                Write-Host "  Started: $_" -ForegroundColor Green
            }
        }
        Show-Status
    }
    "stop" {
        Write-Host "  Stopping SolarCRM services..." -ForegroundColor Yellow
        [array]::Reverse($Services)
        $Services | ForEach-Object {
            $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
            if ($svc -and $svc.Status -eq "Running") {
                Stop-Service -Name $_ -Force
                Write-Host "  Stopped: $_" -ForegroundColor Yellow
            }
        }
    }
    "restart" {
        Write-Host "  Restarting SolarCRM services..." -ForegroundColor Cyan
        $Services | ForEach-Object {
            $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
            if ($svc) {
                Restart-Service -Name $_ -ErrorAction SilentlyContinue
                Write-Host "  Restarted: $_" -ForegroundColor Green
            }
        }
        Start-Sleep 2
        Show-Status
    }
    "status" {
        Show-Status
    }
    "logs" {
        Write-Host "`n  Recent SolarCRM logs:" -ForegroundColor Cyan
        $logFile = "$LogDir\solar-crm.log"
        if (Test-Path $logFile) {
            Get-Content $logFile -Tail 50 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } else {
            Write-Host "  No logs found at $logFile" -ForegroundColor Yellow
        }
    }
}

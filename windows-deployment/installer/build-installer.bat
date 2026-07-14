@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM  SolarCRM Windows Installer Builder
REM  Run this script on a Windows machine that has:
REM    - NSIS 3.x installed (https://nsis.sourceforge.io/) with makensis in PATH
REM    - Node.js 20+ in PATH
REM    - pnpm installed globally (npm install -g pnpm)
REM
REM  OUTPUT: installer\SolarCRM_Setup.exe
REM ============================================================================

echo.
echo  ============================================
echo   SolarCRM Installer Builder
echo  ============================================
echo.

REM ── Check prerequisites ────────────────────────────────────────────────────
where makensis >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: makensis not found in PATH.
    echo  Please install NSIS 3.x from https://nsis.sourceforge.io/
    echo  and ensure its directory is in your PATH, then re-run.
    pause & exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Node.js not found. Install from https://nodejs.org/
    pause & exit /b 1
)

where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  pnpm not found — installing globally...
    npm install -g pnpm
    if %ERRORLEVEL% neq 0 ( echo  ERROR: pnpm install failed & pause & exit /b 1 )
)

REM ── Set paths ──────────────────────────────────────────────────────────────
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..\..
set BUNDLE_DIR=%SCRIPT_DIR%bundle
set API_DIR=%ROOT_DIR%\artifacts\api-server
set FRONTEND_DIR=%ROOT_DIR%\artifacts\solar-crm
set NODE_VER=v20.14.0
set NODE_BUNDLE_URL=https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip
set NODE_ZIP=%TEMP%\node-%NODE_VER%-win-x64.zip
set NSSM_URL=https://nssm.cc/release/nssm-2.24.zip
set NSSM_ZIP=%TEMP%\nssm-2.24.zip

REM ── Step 1: Build frontend ─────────────────────────────────────────────────
echo  [1/8] Building frontend (React)...
cd /d "%FRONTEND_DIR%"
set BASE_PATH=/
set PORT=1
set NODE_ENV=production
call pnpm run build
if %ERRORLEVEL% neq 0 ( echo  ERROR: Frontend build failed & pause & exit /b 1 )
echo  Frontend built OK.

REM ── Step 2: Build backend ──────────────────────────────────────────────────
echo.
echo  [2/8] Building backend (Express + esbuild)...
cd /d "%API_DIR%"
set NODE_ENV=production
call pnpm run build
if %ERRORLEVEL% neq 0 ( echo  ERROR: Backend build failed & pause & exit /b 1 )
echo  Backend built OK.

REM ── Step 3: Create clean bundle directory ─────────────────────────────────
echo.
echo  [3/8] Creating installer bundle directory...
if exist "%BUNDLE_DIR%" rd /s /q "%BUNDLE_DIR%"
mkdir "%BUNDLE_DIR%\app"
mkdir "%BUNDLE_DIR%\node"
mkdir "%BUNDLE_DIR%\tools"
mkdir "%BUNDLE_DIR%\scripts"
mkdir "%BUNDLE_DIR%\config"
mkdir "%BUNDLE_DIR%\assets"
mkdir "%BUNDLE_DIR%\sql"

REM Copy backend build output
xcopy /s /e /q "%API_DIR%\dist" "%BUNDLE_DIR%\app\dist\" >nul
echo  Backend dist copied.

REM Copy built React frontend into backend's public/ directory
xcopy /s /e /q "%FRONTEND_DIR%\dist\public" "%BUNDLE_DIR%\app\dist\public\" >nul
echo  Frontend copied into app/dist/public/.

REM Copy PowerShell management scripts
xcopy /q "%SCRIPT_DIR%..\scripts\*.ps1" "%BUNDLE_DIR%\scripts\" >nul
echo  Scripts copied.

REM Copy config templates
xcopy /s /e /q "%SCRIPT_DIR%..\config\*" "%BUNDLE_DIR%\config\" >nul
echo  Config templates copied.

REM Copy installer assets (icon, BMPs, license) from committed source
xcopy /q "%SCRIPT_DIR%assets\*" "%BUNDLE_DIR%\assets\" >nul
echo  Installer assets copied.

REM Copy SQL schema migrations from committed source
xcopy /q "%SCRIPT_DIR%sql\*" "%BUNDLE_DIR%\sql\" >nul
echo  SQL migrations copied.

REM ── Step 4: Download portable Node.js ─────────────────────────────────────
echo.
echo  [4/8] Downloading portable Node.js %NODE_VER%...
if not exist "%NODE_ZIP%" (
    powershell -NoProfile -Command "Invoke-WebRequest -Uri '%NODE_BUNDLE_URL%' -OutFile '%NODE_ZIP%' -UseBasicParsing"
    if %ERRORLEVEL% neq 0 ( echo  ERROR: Failed to download Node.js & pause & exit /b 1 )
)
if exist "%TEMP%\node-extract" rd /s /q "%TEMP%\node-extract"
powershell -NoProfile -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%TEMP%\node-extract' -Force"
xcopy /s /e /q "%TEMP%\node-extract\node-%NODE_VER%-win-x64\*" "%BUNDLE_DIR%\node\" >nul
echo  Node.js %NODE_VER% bundled OK.

REM ── Step 5: Download NSSM ──────────────────────────────────────────────────
echo.
echo  [5/8] Downloading NSSM (service manager)...
if not exist "%NSSM_ZIP%" (
    powershell -NoProfile -Command "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%NSSM_ZIP%' -UseBasicParsing"
    if %ERRORLEVEL% neq 0 ( echo  ERROR: Failed to download NSSM & pause & exit /b 1 )
)
if exist "%TEMP%\nssm-extract" rd /s /q "%TEMP%\nssm-extract"
powershell -NoProfile -Command "Expand-Archive -Path '%NSSM_ZIP%' -DestinationPath '%TEMP%\nssm-extract' -Force"
copy /y "%TEMP%\nssm-extract\nssm-2.24\win64\nssm.exe" "%BUNDLE_DIR%\tools\" >nul
echo  NSSM bundled OK.

REM ── Step 6: Verify bundle completeness ────────────────────────────────────
echo.
echo  [6/8] Verifying bundle structure...
set MISSING=0

if not exist "%BUNDLE_DIR%\app\dist\index.mjs"        ( echo  MISSING: app\dist\index.mjs      & set MISSING=1 )
if not exist "%BUNDLE_DIR%\app\dist\seed.mjs"          ( echo  MISSING: app\dist\seed.mjs        & set MISSING=1 )
if not exist "%BUNDLE_DIR%\app\dist\public\index.html" ( echo  MISSING: app\dist\public\index.html & set MISSING=1 )
if not exist "%BUNDLE_DIR%\node\node.exe"              ( echo  MISSING: node\node.exe             & set MISSING=1 )
if not exist "%BUNDLE_DIR%\tools\nssm.exe"             ( echo  MISSING: tools\nssm.exe            & set MISSING=1 )
if not exist "%BUNDLE_DIR%\scripts\Install-Service.ps1"( echo  MISSING: scripts\Install-Service.ps1 & set MISSING=1 )
if not exist "%BUNDLE_DIR%\scripts\Setup-Database.ps1" ( echo  MISSING: scripts\Setup-Database.ps1 & set MISSING=1 )
if not exist "%BUNDLE_DIR%\assets\solar-crm.ico"       ( echo  MISSING: assets\solar-crm.ico     & set MISSING=1 )
if not exist "%BUNDLE_DIR%\assets\header.bmp"          ( echo  MISSING: assets\header.bmp        & set MISSING=1 )
if not exist "%BUNDLE_DIR%\assets\welcome.bmp"         ( echo  MISSING: assets\welcome.bmp       & set MISSING=1 )
if not exist "%BUNDLE_DIR%\assets\license.txt"         ( echo  MISSING: assets\license.txt       & set MISSING=1 )
if not exist "%BUNDLE_DIR%\sql\0001_schema.sql"        ( echo  MISSING: sql\0001_schema.sql      & set MISSING=1 )
if not exist "%BUNDLE_DIR%\config\solar-crm.env.template" ( echo  MISSING: config\solar-crm.env.template & set MISSING=1 )

if %MISSING% neq 0 (
    echo.
    echo  ERROR: Bundle is incomplete. Fix the missing files above and retry.
    pause & exit /b 1
)
echo  Bundle verification PASSED.

REM ── Step 7: Compile NSIS installer ────────────────────────────────────────
echo.
echo  [7/8] Compiling NSIS installer (makensis setup.nsi)...
cd /d "%SCRIPT_DIR%"
makensis /V3 setup.nsi
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: NSIS compilation failed (exit code %ERRORLEVEL%).
    echo  Check the makensis output above for details.
    pause & exit /b 1
)

REM ── Step 8: Report ────────────────────────────────────────────────────────
echo.
if exist "%SCRIPT_DIR%SolarCRM_Setup.exe" (
    for %%F in ("%SCRIPT_DIR%SolarCRM_Setup.exe") do (
        set SIZE=%%~zF
        set /a SIZE_MB=!SIZE! / 1048576
    )
    echo  ============================================
    echo   SUCCESS!
    echo   Installer: %SCRIPT_DIR%SolarCRM_Setup.exe
    echo   Size: !SIZE_MB! MB
    echo  ============================================
    echo.
    echo  Distribute SolarCRM_Setup.exe to clients.
    echo  They double-click the file and follow the wizard.
) else (
    echo  ERROR: SolarCRM_Setup.exe was not created.
    pause & exit /b 1
)

pause

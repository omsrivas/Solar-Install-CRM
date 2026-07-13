@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM  SolarCRM Windows Installer Builder
REM  Run this script on a Windows machine that has:
REM    - NSIS 3.x installed (https://nsis.sourceforge.io/)
REM    - Node.js 20+ in PATH
REM    - pnpm installed
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
    echo  Please install NSIS from https://nsis.sourceforge.io/
    echo  and add it to your PATH, then re-run this script.
    pause & exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  ERROR: Node.js not found. Install from https://nodejs.org/
    pause & exit /b 1
)

where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  Installing pnpm...
    npm install -g pnpm
)

REM ── Set paths ──────────────────────────────────────────────────────────────
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..\..
set BUNDLE_DIR=%SCRIPT_DIR%bundle
set API_DIR=%ROOT_DIR%\artifacts\api-server
set FRONTEND_DIR=%ROOT_DIR%\artifacts\solar-crm
set NODE_BUNDLE_URL=https://nodejs.org/dist/v20.14.0/node-v20.14.0-win-x64.zip
set NODE_ZIP=%TEMP%\node-v20.14.0-win-x64.zip
set NSSM_URL=https://nssm.cc/release/nssm-2.24.zip
set NSSM_ZIP=%TEMP%\nssm-2.24.zip

echo  Step 1/7: Building frontend...
echo  -------------------------------------------
cd /d "%FRONTEND_DIR%"
call pnpm run build
if %ERRORLEVEL% neq 0 ( echo  ERROR: Frontend build failed & pause & exit /b 1 )
echo  Frontend built OK.

echo.
echo  Step 2/7: Building backend...
echo  -------------------------------------------
cd /d "%API_DIR%"
call pnpm run build
if %ERRORLEVEL% neq 0 ( echo  ERROR: Backend build failed & pause & exit /b 1 )
echo  Backend built OK.

echo.
echo  Step 3/7: Creating bundle directory...
echo  -------------------------------------------
if exist "%BUNDLE_DIR%" rd /s /q "%BUNDLE_DIR%"
mkdir "%BUNDLE_DIR%\app\dist"
mkdir "%BUNDLE_DIR%\app\public"
mkdir "%BUNDLE_DIR%\node"
mkdir "%BUNDLE_DIR%\tools"
mkdir "%BUNDLE_DIR%\scripts"
mkdir "%BUNDLE_DIR%\config"
mkdir "%BUNDLE_DIR%\assets"

REM Copy backend dist
xcopy /s /q "%API_DIR%\dist" "%BUNDLE_DIR%\app\dist\" >nul
echo  Backend files copied.

REM Copy frontend into the backend's public directory
xcopy /s /q "%FRONTEND_DIR%\dist\public" "%BUNDLE_DIR%\app\dist\public\" >nul
echo  Frontend files copied into backend public/.

REM Copy drizzle config for schema push
copy "%API_DIR%\..\..\lib\db\drizzle.config.ts" "%BUNDLE_DIR%\app\" >nul 2>&1
echo  Drizzle config copied.

REM Copy scripts
xcopy /s /q "%SCRIPT_DIR%..\scripts\*.ps1" "%BUNDLE_DIR%\scripts\" >nul
xcopy /s /q "%SCRIPT_DIR%..\scripts\*.bat" "%BUNDLE_DIR%\scripts\" >nul 2>&1
echo  Scripts copied.

REM Copy config templates
xcopy /s /q "%SCRIPT_DIR%..\config\*" "%BUNDLE_DIR%\config\" >nul
echo  Config templates copied.

echo.
echo  Step 4/7: Downloading portable Node.js...
echo  -------------------------------------------
if not exist "%NODE_ZIP%" (
    echo  Downloading Node.js v20.14.0...
    powershell -Command "Invoke-WebRequest -Uri '%NODE_BUNDLE_URL%' -OutFile '%NODE_ZIP%'"
    if %ERRORLEVEL% neq 0 ( echo  ERROR: Failed to download Node.js & pause & exit /b 1 )
)
echo  Extracting Node.js...
powershell -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%TEMP%\node-extract' -Force"
xcopy /s /q "%TEMP%\node-extract\node-v20.14.0-win-x64\*" "%BUNDLE_DIR%\node\" >nul
echo  Node.js bundled OK.

echo.
echo  Step 5/7: Downloading NSSM...
echo  -------------------------------------------
if not exist "%NSSM_ZIP%" (
    echo  Downloading NSSM...
    powershell -Command "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%NSSM_ZIP%'"
)
powershell -Command "Expand-Archive -Path '%NSSM_ZIP%' -DestinationPath '%TEMP%\nssm-extract' -Force"
copy "%TEMP%\nssm-extract\nssm-2.24\win64\nssm.exe" "%BUNDLE_DIR%\tools\" >nul
echo  NSSM bundled OK.

echo.
echo  Step 6/7: Preparing installer assets...
echo  -------------------------------------------
REM Create a simple placeholder icon if none exists
if not exist "%BUNDLE_DIR%\assets\solar-crm.ico" (
    echo  NOTE: Place solar-crm.ico in installer\assets\ for a custom icon.
    REM Copy a system icon as placeholder
    copy "%SYSTEMROOT%\System32\shell32.dll" "%BUNDLE_DIR%\assets\placeholder.ico" >nul 2>&1
)

REM Create license.txt
echo SolarCRM Software License > "%BUNDLE_DIR%\assets\license.txt"
echo. >> "%BUNDLE_DIR%\assets\license.txt"
echo This software is provided for use by the licensed business only. >> "%BUNDLE_DIR%\assets\license.txt"
echo All data remains the property of the installing business. >> "%BUNDLE_DIR%\assets\license.txt"

echo  Assets prepared.

echo.
echo  Step 7/7: Compiling NSIS installer...
echo  -------------------------------------------
cd /d "%SCRIPT_DIR%"
makensis setup.nsi
if %ERRORLEVEL% neq 0 ( echo  ERROR: NSIS compilation failed & pause & exit /b 1 )

echo.
echo  ============================================
echo   SUCCESS! Installer created:
echo   %SCRIPT_DIR%SolarCRM_Setup.exe
echo  ============================================
echo.
echo  Distribute SolarCRM_Setup.exe to clients.
echo  They just double-click and follow the wizard.
echo.
pause

; ============================================================================
;  SolarCRM Windows Installer — NSIS Script
;  Compile with: makensis setup.nsi
;  Requires: NSIS 3.x  https://nsis.sourceforge.io/
;
;  The bundle\ directory must be fully assembled before running makensis.
;  Use build-installer.bat (Windows) or the GitHub Actions workflow (CI).
; ============================================================================

Unicode True
SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"
!include "FileFunc.nsh"
!include "WordFunc.nsh"

; ── Build-time constants ──────────────────────────────────────────────────────
; makensis is invoked from the installer\ directory, so bundle\ is a sibling.
!define APP_NAME        "SolarCRM"
!define APP_FULL_NAME   "SunPower Solar CRM"
!define APP_VERSION     "1.0.0"
!define PUBLISHER       "SunPower Solar"
!define INSTALL_DIR     "$PROGRAMFILES64\SolarCRM"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\SolarCRM"
!define SERVICE_NAME    "SolarCRM"
!define APP_PORT        "3000"
!define PG_VERSION      "16"
!define BUNDLE_DIR      "bundle"

; ── Installer metadata ────────────────────────────────────────────────────────
Name             "${APP_FULL_NAME} ${APP_VERSION}"
OutFile          "SolarCRM_Setup.exe"
InstallDir       "${INSTALL_DIR}"
InstallDirRegKey HKLM "${UNINSTALL_KEY}" "InstallLocation"
RequestExecutionLevel admin
ShowInstDetails  show
BrandingText     "SunPower Solar CRM Installer v${APP_VERSION}"

; ── MUI Settings ──────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON                         "${BUNDLE_DIR}\assets\solar-crm.ico"
!define MUI_UNICON                       "${BUNDLE_DIR}\assets\solar-crm.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP           "${BUNDLE_DIR}\assets\header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP     "${BUNDLE_DIR}\assets\welcome.bmp"
!define MUI_WELCOMEPAGE_TITLE            "Welcome to SolarCRM Setup"
!define MUI_WELCOMEPAGE_TEXT             "This wizard will install SolarCRM on your computer.$\r$\n$\r$\nSolarCRM is a complete solar installation management system including lead tracking, project management, invoicing, inventory, and service call management.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT          "Open SolarCRM in browser"
!define MUI_FINISHPAGE_RUN_FUNCTION      "OpenBrowser"
!define MUI_FINISHPAGE_TITLE             "SolarCRM Installed Successfully"
!define MUI_FINISHPAGE_TEXT              "SolarCRM has been installed and started as a Windows service.$\r$\n$\r$\nDefault login:$\r$\n  Email:    admin@solarcrm.com$\r$\n  Password: admin123$\r$\n$\r$\nPlease change the admin password after your first login.$\r$\n$\r$\nOther devices on your network can access SolarCRM at:$\r$\nhttp://<this-computer-IP>:${APP_PORT}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE    "${BUNDLE_DIR}\assets\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Variables ──────────────────────────────────────────────────────────────────
Var PgInstalled
Var PgPath
Var LocalIP

; ── Utility: find PostgreSQL ───────────────────────────────────────────────────
Function FindPostgreSQL
    StrCpy $PgInstalled "0"
    ReadRegStr $PgPath HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-${PG_VERSION}" "Base Directory"
    ${If} $PgPath != ""
        StrCpy $PgInstalled "1"
    ${Else}
        ; Try any version in the default install location
        FindFirst $0 $1 "$PROGRAMFILES64\PostgreSQL\*"
        ${If} $1 != ""
            StrCpy $PgPath "$PROGRAMFILES64\PostgreSQL\$1"
            StrCpy $PgInstalled "1"
            FindClose $0
        ${EndIf}
    ${EndIf}
FunctionEnd

; ── Utility: get local IP ──────────────────────────────────────────────────────
Function GetLocalIP
    nsExec::ExecToStack 'powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike \"127.*\" -and $_.IPAddress -notlike \"169.*\" } | Select-Object -First 1).IPAddress"'
    Pop $0  ; return code
    Pop $LocalIP
    StrCpy $LocalIP "$LocalIP" -2  ; trim trailing CRLF
FunctionEnd

; ── Utility: open browser ──────────────────────────────────────────────────────
Function OpenBrowser
    ExecShell "open" "http://localhost:${APP_PORT}"
FunctionEnd

; ============================================================================
;  SECTION: Check and install PostgreSQL
; ============================================================================
Section "-Prerequisites" SEC_PRE
    SetOutPath "$TEMP\SolarCRM-Install"

    ; ── Check for PostgreSQL ────────────────────────────────────────────────
    Call FindPostgreSQL
    ${If} $PgInstalled == "0"
        DetailPrint "PostgreSQL not found. Downloading installer (this may take a few minutes)..."
        ; Use PowerShell Invoke-WebRequest — no external NSIS plugin required
        nsExec::ExecToLog 'powershell -NoProfile -Command "Invoke-WebRequest -Uri ''https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe'' -OutFile ''$TEMP\SolarCRM-Install\postgresql-installer.exe'' -UseBasicParsing"'
        Pop $0
        ${If} $0 != "0"
            MessageBox MB_ICONEXCLAMATION "Failed to download PostgreSQL installer.$\r$\n$\r$\nPlease install PostgreSQL 16 manually from:$\r$\nhttps://www.postgresql.org/download/windows/$\r$\n$\r$\nThen re-run this installer."
            Abort
        ${EndIf}
        DetailPrint "Installing PostgreSQL (this may take several minutes)..."
        ExecWait '"$TEMP\SolarCRM-Install\postgresql-installer.exe" \
            --mode unattended \
            --superpassword "SolarCRM_PgSuperPass_2024!" \
            --servicename "postgresql-x64-16" \
            --serviceaccount "NT Authority\NetworkService" \
            --serverport 5432 \
            --datadir "$PROGRAMDATA\PostgreSQL\16\data" \
            --install_runtimes 0' $0
        ${If} $0 != "0"
            MessageBox MB_ICONEXCLAMATION "PostgreSQL installation failed (error code: $0).$\r$\n$\r$\nPlease install PostgreSQL 16 manually then re-run this installer."
            Abort
        ${EndIf}
        StrCpy $PgPath "$PROGRAMFILES64\PostgreSQL\16"
        DetailPrint "PostgreSQL installed successfully."
    ${Else}
        DetailPrint "PostgreSQL found at: $PgPath"
    ${EndIf}
SectionEnd

; ============================================================================
;  SECTION: Install application files
; ============================================================================
Section "${APP_FULL_NAME}" SEC_APP
    SectionIn RO  ; Required — cannot be deselected

    ; ── Application files (backend + bundled frontend) ──────────────────────
    ; Install-Service.ps1 and Setup-Database.ps1 both expect:
    ;   $INSTDIR\app\dist\index.mjs  (server entry point)
    ;   $INSTDIR\app\dist\seed.mjs   (database seeder)
    ;   $INSTDIR\app\dist\public\    (React frontend static files)
    DetailPrint "Installing SolarCRM application files..."
    SetOutPath "$INSTDIR\app"
    File /r "${BUNDLE_DIR}\app\"

    ; ── Portable Node.js runtime ─────────────────────────────────────────────
    DetailPrint "Installing Node.js runtime..."
    SetOutPath "$INSTDIR\node"
    File /r "${BUNDLE_DIR}\node\"

    ; ── NSSM (service manager) ───────────────────────────────────────────────
    DetailPrint "Installing service manager..."
    SetOutPath "$INSTDIR\tools"
    File "${BUNDLE_DIR}\tools\nssm.exe"

    ; ── PowerShell management scripts ────────────────────────────────────────
    SetOutPath "$INSTDIR\scripts"
    File "${BUNDLE_DIR}\scripts\*.ps1"

    ; ── Configuration templates ──────────────────────────────────────────────
    SetOutPath "$INSTDIR\config"
    File "${BUNDLE_DIR}\config\*.*"

    ; ── SQL schema migrations (applied by Setup-Database.ps1) ────────────────
    SetOutPath "$INSTDIR\sql"
    File "${BUNDLE_DIR}\sql\*.sql"

    ; ── App icon (used by shortcuts and Add/Remove Programs) ─────────────────
    SetOutPath "$INSTDIR\assets"
    File "${BUNDLE_DIR}\assets\solar-crm.ico"

    ; ── Create empty directories for runtime use ─────────────────────────────
    SetOutPath "$INSTDIR\backups"
    SetOutPath "$INSTDIR\logs"

    ; ── Generate configuration file ──────────────────────────────────────────
    DetailPrint "Writing configuration..."
    Call GetLocalIP

    ; Generate a random JWT secret via PowerShell
    nsExec::ExecToStack 'powershell -NoProfile -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))"'
    Pop $0   ; return code
    Pop $1   ; JWT secret string
    StrCpy $1 "$1" -2   ; trim trailing CRLF

    FileOpen $0 "$INSTDIR\config\solar-crm.env" w
    FileWrite $0 "# SolarCRM Runtime Configuration$\r$\n"
    FileWrite $0 "# Generated by installer — edit carefully$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "NODE_ENV=production$\r$\n"
    FileWrite $0 "PORT=${APP_PORT}$\r$\n"
    FileWrite $0 "DATABASE_URL=postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm$\r$\n"
    FileWrite $0 "JWT_SECRET=$1$\r$\n"
    FileWrite $0 "ALLOWED_ORIGIN=*$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "# PostgreSQL superuser password (used by setup scripts only)$\r$\n"
    FileWrite $0 "PG_PASSWORD=SolarCRM_PgSuperPass_2024!$\r$\n"
    FileWrite $0 "DB_NAME=solar_crm$\r$\n"
    FileWrite $0 "DB_USER=solar_crm_user$\r$\n"
    FileWrite $0 "DB_PASS=solar_crm_db_pass$\r$\n"
    FileWrite $0 "$\r$\n"
    FileWrite $0 "APP_VERSION=${APP_VERSION}$\r$\n"
    FileWrite $0 "SERVER_IP=$LocalIP$\r$\n"
    FileClose $0

SectionEnd

; ============================================================================
;  SECTION: Setup database
; ============================================================================
Section "-Database Setup" SEC_DB
    DetailPrint "Setting up database (creating user, schema, demo data)..."
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Setup-Database.ps1" -PgPassword "SolarCRM_PgSuperPass_2024!" -Seed'
    Pop $0
    ${If} $0 != "0"
        MessageBox MB_ICONEXCLAMATION "Database setup encountered an issue (code: $0).$\r$\n$\r$\nSolarCRM may still work if a database already exists.$\r$\n$\r$\nTo retry manually, run as Administrator:$\r$\n$INSTDIR\scripts\Setup-Database.ps1 -Seed"
    ${Else}
        DetailPrint "Database configured successfully."
    ${EndIf}
SectionEnd

; ============================================================================
;  SECTION: Install Windows service
; ============================================================================
Section "-Windows Service" SEC_SVC
    DetailPrint "Installing SolarCRM as a Windows service..."
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Install-Service.ps1" -InstallDir "$INSTDIR"'
    Pop $0
    ${If} $0 != "0"
        MessageBox MB_ICONEXCLAMATION "Service installation failed (code: $0).$\r$\n$\r$\nSolarCRM will not start automatically.$\r$\nTo retry, run as Administrator:$\r$\n$INSTDIR\scripts\Install-Service.ps1"
    ${Else}
        DetailPrint "Service installed and started."
    ${EndIf}
SectionEnd

; ============================================================================
;  SECTION: Configure firewall
; ============================================================================
Section "-Firewall" SEC_FW
    DetailPrint "Configuring Windows Firewall (opening port ${APP_PORT})..."
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Configure-Firewall.ps1" -AppPort ${APP_PORT}'
    Pop $0
    DetailPrint "Firewall rule applied."
SectionEnd

; ============================================================================
;  SECTION: Create shortcuts
; ============================================================================
Section "-Shortcuts" SEC_SC
    DetailPrint "Creating shortcuts..."

    ; Desktop URL shortcut (opens browser to the app)
    WriteIniStr "$DESKTOP\SolarCRM.url"      "InternetShortcut" "URL"       "http://localhost:${APP_PORT}"
    WriteIniStr "$DESKTOP\SolarCRM.url"      "InternetShortcut" "IconFile"  "$INSTDIR\assets\solar-crm.ico"
    WriteIniStr "$DESKTOP\SolarCRM.url"      "InternetShortcut" "IconIndex" "0"

    ; Start Menu folder
    CreateDirectory "$SMPROGRAMS\SolarCRM"
    WriteIniStr "$SMPROGRAMS\SolarCRM\Open SolarCRM.url" "InternetShortcut" "URL" "http://localhost:${APP_PORT}"
    WriteIniStr "$SMPROGRAMS\SolarCRM\Open SolarCRM.url" "InternetShortcut" "IconFile"  "$INSTDIR\assets\solar-crm.ico"
    WriteIniStr "$SMPROGRAMS\SolarCRM\Open SolarCRM.url" "InternetShortcut" "IconIndex" "0"

    CreateShortCut "$SMPROGRAMS\SolarCRM\Manage Services.lnk" \
        "powershell.exe" \
        '-NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Manage-Service.ps1" -Action status' \
        "" 0 SW_SHOWNORMAL "" "Manage SolarCRM Services"

    CreateShortCut "$SMPROGRAMS\SolarCRM\Backup Database.lnk" \
        "powershell.exe" \
        '-NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Backup-Database.ps1"' \
        "" 0 SW_SHOWNORMAL "" "Backup SolarCRM Database"

    CreateShortCut "$SMPROGRAMS\SolarCRM\Uninstall SolarCRM.lnk" \
        "$INSTDIR\Uninstall.exe" "" "$INSTDIR\assets\solar-crm.ico" 0
SectionEnd

; ============================================================================
;  SECTION: Register in Add/Remove Programs
; ============================================================================
Section "-Registry" SEC_REG
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayName"      "${APP_FULL_NAME}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayVersion"   "${APP_VERSION}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "Publisher"        "${PUBLISHER}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "InstallLocation"  "$INSTDIR"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "UninstallString"  '"$INSTDIR\Uninstall.exe"'
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayIcon"      "$INSTDIR\assets\solar-crm.ico"
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify"         1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair"         1

    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize" $0

    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; ============================================================================
;  SECTION: Schedule automatic backup
; ============================================================================
Section "-Schedule Backup" SEC_BAK
    DetailPrint "Scheduling daily automatic backup at 2:00 AM..."
    nsExec::ExecToLog 'schtasks /create /tn "SolarCRM Daily Backup" /tr "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"$INSTDIR\scripts\Backup-Database.ps1\"" /sc daily /st 02:00 /ru SYSTEM /f'
    Pop $0
    ${If} $0 == "0"
        DetailPrint "Daily backup scheduled."
    ${Else}
        DetailPrint "Note: Could not schedule automatic backup. Run Backup-Database.ps1 manually."
    ${EndIf}
SectionEnd

; ============================================================================
;  UNINSTALLER
; ============================================================================
Section "Uninstall"
    ; Stop and remove the Windows service
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Uninstall.ps1" -KeepData'

    ; Remove scheduled backup task
    nsExec::ExecToLog 'schtasks /delete /tn "SolarCRM Daily Backup" /f'
    Pop $0

    ; Remove registry key
    DeleteRegKey HKLM "${UNINSTALL_KEY}"

    ; Remove shortcuts
    Delete "$DESKTOP\SolarCRM.url"
    RMDir /r "$SMPROGRAMS\SolarCRM"

    ; Ask about data retention
    MessageBox MB_YESNO "Keep database backups?$\r$\n(Recommended — your business data is stored here)" IDYES keep_data
        RMDir /r "$INSTDIR"
        Goto uninstall_done
    keep_data:
        RMDir /r "$INSTDIR\app"
        RMDir /r "$INSTDIR\node"
        RMDir /r "$INSTDIR\tools"
        RMDir /r "$INSTDIR\scripts"
        RMDir /r "$INSTDIR\config"
        RMDir /r "$INSTDIR\assets"
        RMDir /r "$INSTDIR\sql"
        RMDir /r "$INSTDIR\logs"
        ; $INSTDIR\backups is intentionally kept
    uninstall_done:
SectionEnd

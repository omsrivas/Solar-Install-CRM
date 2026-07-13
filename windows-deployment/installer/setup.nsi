; ============================================================================
;  SolarCRM Windows Installer — NSIS Script
;  Compile with: makensis setup.nsi
;  Requires: NSIS 3.x  https://nsis.sourceforge.io/
; ============================================================================

Unicode True
SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"
!include "FileFunc.nsh"
!include "WordFunc.nsh"

; ── Build-time constants ─────────────────────────────────────────────────────
!define APP_NAME        "SolarCRM"
!define APP_FULL_NAME   "SunPower Solar CRM"
!define APP_VERSION     "1.0.0"
!define PUBLISHER       "SunPower Solar"
!define INSTALL_DIR     "$PROGRAMFILES64\SolarCRM"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\SolarCRM"
!define SERVICE_NAME    "SolarCRM"
!define APP_PORT        "3000"
!define PG_VERSION      "16"
; The bundle\ directory must be built by build-installer.bat before compiling.
!define BUNDLE_DIR      "..\bundle"

; ── Installer metadata ───────────────────────────────────────────────────────
Name             "${APP_FULL_NAME} ${APP_VERSION}"
OutFile          "SolarCRM_Setup.exe"
InstallDir       "${INSTALL_DIR}"
InstallDirRegKey HKLM "${UNINSTALL_KEY}" "InstallLocation"
RequestExecutionLevel admin
ShowInstDetails  show
BrandingText     "SunPower Solar CRM Installer v${APP_VERSION}"

; ── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON                "${BUNDLE_DIR}\assets\solar-crm.ico"
!define MUI_UNICON              "${BUNDLE_DIR}\assets\solar-crm.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP  "${BUNDLE_DIR}\assets\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${BUNDLE_DIR}\assets\welcome.bmp"
!define MUI_WELCOMEPAGE_TITLE   "Welcome to SolarCRM Setup"
!define MUI_WELCOMEPAGE_TEXT    "This wizard will install SolarCRM on your computer.$\r$\n$\r$\nSolarCRM is a complete solar installation management system.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Open SolarCRM in browser"
!define MUI_FINISHPAGE_RUN_FUNCTION "OpenBrowser"
!define MUI_FINISHPAGE_TITLE   "SolarCRM Installed Successfully"
!define MUI_FINISHPAGE_TEXT    "SolarCRM has been installed and started.$\r$\n$\r$\nDefault login:$\r$\n  Email:    admin@solarcrm.com$\r$\n  Password: admin123$\r$\n$\r$\nChange the admin password after your first login.$\r$\n$\r$\nAll other devices on your network can access SolarCRM at:$\r$\nhttp://<this-computer-ip>:3000"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE    "${BUNDLE_DIR}\assets\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Variables ─────────────────────────────────────────────────────────────────
Var PgInstalled
Var PgPath
Var LocalIP

; ── Utility: find PostgreSQL ──────────────────────────────────────────────────
Function FindPostgreSQL
    StrCpy $PgInstalled "0"
    ReadRegStr $PgPath HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-${PG_VERSION}" "Base Directory"
    ${If} $PgPath != ""
        StrCpy $PgInstalled "1"
    ${Else}
        ; Also try older/newer versions
        FindFirst $0 $1 "$PROGRAMFILES64\PostgreSQL\*"
        loop:
            ${If} $1 != ""
                StrCpy $PgPath "$PROGRAMFILES64\PostgreSQL\$1"
                StrCpy $PgInstalled "1"
                FindClose $0
                Goto done
            ${EndIf}
        done:
    ${EndIf}
FunctionEnd

; ── Utility: get local IP ─────────────────────────────────────────────────────
Function GetLocalIP
    nsExec::ExecToStack 'powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike \"127.*\" -and $_.IPAddress -notlike \"169.*\" } | Select-Object -First 1).IPAddress"'
    Pop $0  ; return code
    Pop $LocalIP
    StrCpy $LocalIP "$LocalIP" -2  ; trim trailing CRLF
FunctionEnd

; ── Utility: open browser ─────────────────────────────────────────────────────
Function OpenBrowser
    ExecShell "open" "http://localhost:${APP_PORT}"
FunctionEnd

; ============================================================================
;  SECTION: Check prerequisites
; ============================================================================
Section "-Prerequisites" SEC_PRE
    SetOutPath "$TEMP\SolarCRM-Install"

    ; ── Check / install Visual C++ Redistributable ─────────────────────────
    ; (Node.js 20 requires MSVC runtime)
    ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
    ${If} $0 != "1"
        DetailPrint "Installing Visual C++ Redistributable..."
        File "${BUNDLE_DIR}\vcredist_x64.exe"
        ExecWait '"$TEMP\SolarCRM-Install\vcredist_x64.exe" /quiet /norestart'
    ${EndIf}

    ; ── Check / install PostgreSQL ─────────────────────────────────────────
    Call FindPostgreSQL
    ${If} $PgInstalled == "0"
        DetailPrint "PostgreSQL not found. Downloading installer..."
        inetc::get \
            "https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe" \
            "$TEMP\SolarCRM-Install\postgresql-installer.exe" \
            /END
        Pop $0
        ${If} $0 != "OK"
            MessageBox MB_ICONEXCLAMATION "Failed to download PostgreSQL installer. Please install PostgreSQL 16 manually from https://www.postgresql.org/download/windows/ then re-run this installer."
            Abort
        ${EndIf}
        DetailPrint "Installing PostgreSQL (this may take a few minutes)..."
        ExecWait '"$TEMP\SolarCRM-Install\postgresql-installer.exe" \
            --mode unattended \
            --superpassword "SolarCRM_PgSuperPass_2024!" \
            --servicename "postgresql-x64-16" \
            --serviceaccount "NT Authority\NetworkService" \
            --serverport 5432 \
            --datadir "$PROGRAMDATA\PostgreSQL\16\data" \
            --install_runtimes 0' $0
        ${If} $0 != "0"
            MessageBox MB_ICONEXCLAMATION "PostgreSQL installation failed (error $0). Please install PostgreSQL 16 manually then re-run this installer."
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

    ; ── Extract application ────────────────────────────────────────────────
    DetailPrint "Installing SolarCRM files..."
    SetOutPath "$INSTDIR"
    File /r "${BUNDLE_DIR}\app\*.*"

    SetOutPath "$INSTDIR\node"
    File /r "${BUNDLE_DIR}\node\*.*"

    SetOutPath "$INSTDIR\tools"
    File "${BUNDLE_DIR}\tools\nssm.exe"

    SetOutPath "$INSTDIR\scripts"
    File "${BUNDLE_DIR}\scripts\*.ps1"
    File "${BUNDLE_DIR}\scripts\*.bat"

    SetOutPath "$INSTDIR\config"
    File "${BUNDLE_DIR}\config\*.*"

    SetOutPath "$INSTDIR\backups"
    ; (empty directory for future backups)

    SetOutPath "$INSTDIR\logs"
    ; (empty directory for logs)

    ; ── Write config file ──────────────────────────────────────────────────
    DetailPrint "Writing configuration..."
    Call GetLocalIP
    ; Generate a random JWT secret using PowerShell
    nsExec::ExecToStack 'powershell -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))"'
    Pop $0
    Pop $1
    StrCpy $1 "$1" -2  ; trim CRLF

    FileOpen $0 "$INSTDIR\config\solar-crm.env" w
    FileWrite $0 "# SolarCRM Configuration$\r$\n"
    FileWrite $0 "# Generated by installer on $\r$\n"
    FileWrite $0 "NODE_ENV=production$\r$\n"
    FileWrite $0 "PORT=${APP_PORT}$\r$\n"
    FileWrite $0 "DATABASE_URL=postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm$\r$\n"
    FileWrite $0 "JWT_SECRET=$1$\r$\n"
    FileWrite $0 "PG_PASSWORD=SolarCRM_PgSuperPass_2024!$\r$\n"
    FileWrite $0 "DB_NAME=solar_crm$\r$\n"
    FileWrite $0 "DB_USER=solar_crm_user$\r$\n"
    FileWrite $0 "DB_PASS=solar_crm_db_pass$\r$\n"
    FileWrite $0 "APP_VERSION=${APP_VERSION}$\r$\n"
    FileWrite $0 "SERVER_IP=$LocalIP$\r$\n"
    FileClose $0

SectionEnd

; ============================================================================
;  SECTION: Setup database
; ============================================================================
Section "-Database Setup" SEC_DB
    DetailPrint "Setting up database..."
    nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Setup-Database.ps1" -PgPassword "SolarCRM_PgSuperPass_2024!" -Seed'
    Pop $0
    ${If} $0 != "0"
        MessageBox MB_ICONEXCLAMATION "Database setup failed. Check the log for details. You can run Setup-Database.ps1 manually later."
    ${Else}
        DetailPrint "Database configured successfully."
    ${EndIf}
SectionEnd

; ============================================================================
;  SECTION: Install Windows service
; ============================================================================
Section "-Windows Service" SEC_SVC
    DetailPrint "Installing Windows service..."
    nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Install-Service.ps1" -InstallDir "$INSTDIR"'
    Pop $0
    ${If} $0 != "0"
        MessageBox MB_ICONEXCLAMATION "Service installation failed. SolarCRM may not start automatically. Run Install-Service.ps1 as Administrator to retry."
    ${Else}
        DetailPrint "Service installed and started."
    ${EndIf}
SectionEnd

; ============================================================================
;  SECTION: Configure firewall
; ============================================================================
Section "-Firewall" SEC_FW
    DetailPrint "Configuring Windows Firewall..."
    nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Configure-Firewall.ps1" -AppPort ${APP_PORT}'
    Pop $0
    DetailPrint "Firewall configured."
SectionEnd

; ============================================================================
;  SECTION: Create shortcuts
; ============================================================================
Section "-Shortcuts" SEC_SC
    DetailPrint "Creating shortcuts..."

    ; Desktop shortcut (opens browser)
    CreateShortCut "$DESKTOP\SolarCRM.lnk" \
        "$INSTDIR\node\node.exe" "" \
        "$INSTDIR\assets\solar-crm.ico" 0 \
        SW_SHOWMINIMIZED "" "Open SolarCRM"
    ; Actually create a URL shortcut instead (cleaner for browser apps)
    WriteIniStr "$DESKTOP\SolarCRM.url" "InternetShortcut" "URL" "http://localhost:${APP_PORT}"
    WriteIniStr "$DESKTOP\SolarCRM.url" "InternetShortcut" "IconFile" "$INSTDIR\assets\solar-crm.ico"
    WriteIniStr "$DESKTOP\SolarCRM.url" "InternetShortcut" "IconIndex" "0"

    ; Start menu
    CreateDirectory "$SMPROGRAMS\SolarCRM"
    WriteIniStr "$SMPROGRAMS\SolarCRM\Open SolarCRM.url" "InternetShortcut" "URL" "http://localhost:${APP_PORT}"
    CreateShortCut "$SMPROGRAMS\SolarCRM\Manage Services.lnk" \
        "powershell.exe" \
        '-ExecutionPolicy Bypass -File "$INSTDIR\scripts\Manage-Service.ps1" -Action status' \
        "" 0 SW_SHOWNORMAL "" "Manage SolarCRM Services"
    CreateShortCut "$SMPROGRAMS\SolarCRM\Backup Database.lnk" \
        "powershell.exe" \
        '-ExecutionPolicy Bypass -File "$INSTDIR\scripts\Backup-Database.ps1"' \
        "" 0 SW_SHOWNORMAL "" "Backup SolarCRM Database"
    CreateShortCut "$SMPROGRAMS\SolarCRM\Uninstall SolarCRM.lnk" \
        "$INSTDIR\Uninstall.exe" "" "" 0

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
    DetailPrint "Scheduling daily automatic backup..."
    nsExec::ExecToLog 'schtasks /create /tn "SolarCRM Daily Backup" /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"$INSTDIR\scripts\Backup-Database.ps1\"" /sc daily /st 02:00 /ru SYSTEM /f'
    Pop $0
    DetailPrint "Daily backup scheduled at 2:00 AM."
SectionEnd

; ============================================================================
;  UNINSTALLER
; ============================================================================
Section "Uninstall"
    ; Run the PowerShell uninstall script
    nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\scripts\Uninstall.ps1" -KeepData'
    
    ; Remove scheduled task
    nsExec::ExecToLog 'schtasks /delete /tn "SolarCRM Daily Backup" /f'

    ; Remove registry key
    DeleteRegKey HKLM "${UNINSTALL_KEY}"

    ; Remove shortcuts
    Delete "$DESKTOP\SolarCRM.url"
    Delete "$DESKTOP\SolarCRM.lnk"
    RMDir /r "$SMPROGRAMS\SolarCRM"

    ; Remove app directory (but ask about data)
    MessageBox MB_YESNO "Do you want to keep your database backups? (Recommended)" IDYES keep_data
    RMDir /r "$INSTDIR"
    Goto done
    keep_data:
    RMDir /r "$INSTDIR\app"
    RMDir /r "$INSTDIR\node"
    RMDir /r "$INSTDIR\tools"
    done:

SectionEnd

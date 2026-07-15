// SolarCRM Windows Installer
// Build: GOOS=windows GOARCH=amd64 go build -ldflags="-s -w -H windowsgui" -o SolarCRM_Setup.exe .
// The bundle/ directory must be fully assembled before go build.
// CI handles this automatically via .github/workflows/build-installer.yml

package main

import (
	"crypto/rand"
	"embed"
	"encoding/base64"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

//go:embed bundle
var bundleFS embed.FS

// ── Constants ─────────────────────────────────────────────────────────────────

const (
	appVersion  = "1.0.0"
	appPort     = "3000"
	installDir  = `C:\SolarCRM`
	pgSuperPass = "SolarCRM_PgSuperPass_2024!"
	pgURL       = "https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe"
	serviceName = "SolarCRM"
)

// ── Windows API ───────────────────────────────────────────────────────────────

var (
	kernel32     = syscall.NewLazyDLL("kernel32.dll")
	shell32      = syscall.NewLazyDLL("shell32.dll")
	procSetTitle = kernel32.NewProc("SetConsoleTitleW")
	procIsAdmin  = shell32.NewProc("IsUserAnAdmin")
)

func setConsoleTitle(title string) {
	ptr, _ := syscall.UTF16PtrFromString(title)
	procSetTitle.Call(uintptr(unsafe.Pointer(ptr)))
}

func isAdmin() bool {
	ret, _, _ := procIsAdmin.Call()
	return ret != 0
}

func relaunchAsAdmin() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	// PowerShell's Start-Process with -Verb RunAs triggers the UAC prompt
	cmd := exec.Command("powershell", "-NoProfile", "-Command",
		fmt.Sprintf(`Start-Process -FilePath '%s' -Verb RunAs`,
			strings.ReplaceAll(exe, "'", "''")))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Start()
}

// ── Entry point ───────────────────────────────────────────────────────────────

func main() {
	setConsoleTitle("SolarCRM Setup v" + appVersion)
	printBanner()

	// Require admin — re-launch via UAC if not
	if !isAdmin() {
		fmt.Println("  This installer requires Administrator privileges.")
		fmt.Println("  A UAC prompt will appear — click Yes to continue.\n")
		time.Sleep(2 * time.Second)
		relaunchAsAdmin()
		os.Exit(0)
	}

	fmt.Printf("  Installing SolarCRM v%s\n", appVersion)
	fmt.Printf("  Destination : %s\n", installDir)
	fmt.Printf("  Port        : %s\n\n", appPort)

	steps := []struct {
		label string
		fn    func() error
	}{
		{"Creating install directory", createInstallDir},
		{"Extracting application files", extractBundle},
		{"Checking PostgreSQL", ensurePostgres},
		{"Writing configuration", writeConfig},
		{"Setting up database", setupDatabase},
		{"Installing Windows service", installService},
		{"Configuring firewall", configureFirewall},
		{"Creating shortcuts", createShortcuts},
		{"Scheduling daily backup", scheduleBackup},
	}

	for i, s := range steps {
		fmt.Printf("  [%d/%d] %s... ", i+1, len(steps), s.label)
		if err := s.fn(); err != nil {
			fmt.Printf("FAILED\n\n")
			fmt.Printf("  Error: %v\n\n", err)
			fmt.Println("  ─────────────────────────────────────────────")
			fmt.Println("  Fix the error above and run this installer again.")
			fmt.Println("  Press Enter to exit.")
			fmt.Scanln()
			os.Exit(1)
		}
		fmt.Println("OK")
	}

	printSuccess()

	fmt.Print("\n  Press Enter to open SolarCRM in your browser... ")
	fmt.Scanln()
	_ = exec.Command("cmd", "/c", "start", fmt.Sprintf("http://localhost:%s", appPort)).Start()
}

// ── Step: create directory layout ─────────────────────────────────────────────

func createInstallDir() error {
	for _, sub := range []string{
		"app", "node", "tools", "scripts",
		"config", "sql", "assets", "logs", "backups",
	} {
		if err := os.MkdirAll(filepath.Join(installDir, sub), 0o755); err != nil {
			return err
		}
	}
	return nil
}

// ── Step: extract embedded bundle ─────────────────────────────────────────────

func extractBundle() error {
	return fs.WalkDir(bundleFS, "bundle", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// Strip leading "bundle/" prefix to get the destination relative path
		rel := strings.TrimPrefix(path, "bundle/")
		rel = strings.TrimPrefix(rel, "bundle\\")
		if rel == "" || rel == ".gitkeep" {
			return nil
		}
		dest := filepath.Join(installDir, filepath.FromSlash(rel))
		if d.IsDir() {
			return os.MkdirAll(dest, 0o755)
		}
		return copyEmbedFile(path, dest)
	})
}

func copyEmbedFile(src, dest string) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	in, err := bundleFS.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// ── Step: ensure PostgreSQL is installed ──────────────────────────────────────

func ensurePostgres() error {
	if pgPath := findPostgres(); pgPath != "" {
		fmt.Printf("(found) ")
		return nil
	}

	fmt.Println()
	fmt.Println()
	fmt.Println("         PostgreSQL not found.")
	fmt.Println("         Downloading installer (~320 MB) — please wait...")

	pgInstaller := filepath.Join(os.TempDir(), "postgresql-setup.exe")

	if err := runPS(fmt.Sprintf(
		`Invoke-WebRequest -Uri '%s' -OutFile '%s' -UseBasicParsing`,
		pgURL, pgInstaller,
	)); err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	fmt.Println("         Download complete. Installing PostgreSQL silently...")
	fmt.Println("         (This may take 3–5 minutes — please wait)")

	cmd := exec.Command(pgInstaller,
		"--mode", "unattended",
		"--superpassword", pgSuperPass,
		"--servicename", "postgresql-x64-16",
		"--serviceaccount", `NT Authority\NetworkService`,
		"--serverport", "5432",
		"--datadir", `C:\ProgramData\PostgreSQL\16\data`,
		"--install_runtimes", "0",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("PostgreSQL install failed (code %w)\n%s", err, string(out))
	}

	_ = os.Remove(pgInstaller)
	fmt.Print("  [3/9] Checking PostgreSQL... ")
	return nil
}

func findPostgres() string {
	// Check registry
	out, err := exec.Command("powershell", "-NoProfile", "-Command",
		`(Get-ItemProperty 'HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-16' -ErrorAction SilentlyContinue).'Base Directory'`,
	).Output()
	if err == nil {
		if p := strings.TrimSpace(string(out)); p != "" {
			return p
		}
	}

	// Check default install locations
	dirs, _ := filepath.Glob(`C:\Program Files\PostgreSQL\*`)
	if len(dirs) > 0 {
		return dirs[len(dirs)-1]
	}
	return ""
}

// ── Step: write runtime config ────────────────────────────────────────────────

func writeConfig() error {
	// Generate cryptographically random JWT secret
	b := make([]byte, 48)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	jwtSecret := base64.StdEncoding.EncodeToString(b)

	localIP := getLocalIP()

	lines := []string{
		"# SolarCRM Runtime Configuration",
		"# Generated by installer on " + time.Now().Format("2006-01-02"),
		"",
		"NODE_ENV=production",
		"PORT=" + appPort,
		"DATABASE_URL=postgresql://solar_crm_user:solar_crm_db_pass@localhost:5432/solar_crm",
		"JWT_SECRET=" + jwtSecret,
		"ALLOWED_ORIGIN=*",
		"",
		"# PostgreSQL admin credentials (used by setup scripts only)",
		"PG_PASSWORD=" + pgSuperPass,
		"DB_NAME=solar_crm",
		"DB_USER=solar_crm_user",
		"DB_PASS=solar_crm_db_pass",
		"",
		"APP_VERSION=" + appVersion,
		"SERVER_IP=" + localIP,
	}
	content := strings.Join(lines, "\r\n")
	dest := filepath.Join(installDir, "config", "solar-crm.env")
	return os.WriteFile(dest, []byte(content), 0o600)
}

func getLocalIP() string {
	out, err := exec.Command("powershell", "-NoProfile", "-Command",
		`(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress`,
	).Output()
	if err != nil {
		return "localhost"
	}
	ip := strings.TrimSpace(string(out))
	if ip == "" {
		return "localhost"
	}
	return ip
}

// ── Step: database setup ──────────────────────────────────────────────────────

func setupDatabase() error {
	return runPSFile(
		filepath.Join(installDir, "scripts", "Setup-Database.ps1"),
		"-PgPassword", pgSuperPass,
		"-Seed",
	)
}

// ── Step: Windows service ─────────────────────────────────────────────────────

func installService() error {
	return runPSFile(
		filepath.Join(installDir, "scripts", "Install-Service.ps1"),
		"-InstallDir", installDir,
	)
}

// ── Step: firewall ────────────────────────────────────────────────────────────

func configureFirewall() error {
	return runPSFile(
		filepath.Join(installDir, "scripts", "Configure-Firewall.ps1"),
		"-AppPort", appPort,
	)
}

// ── Step: shortcuts ───────────────────────────────────────────────────────────

func createShortcuts() error {
	icoPath := filepath.Join(installDir, "assets", "solar-crm.ico")
	appURL := fmt.Sprintf("http://localhost:%s", appPort)

	// Public desktop (visible to all users)
	publicDesktop := filepath.Join(os.Getenv("PUBLIC"), "Desktop")
	if publicDesktop == `\Desktop` || publicDesktop == "Desktop" {
		publicDesktop = `C:\Users\Public\Desktop`
	}
	_ = writeURLShortcut(filepath.Join(publicDesktop, "SolarCRM.url"), appURL, icoPath)

	// Current user desktop as fallback
	if up := os.Getenv("USERPROFILE"); up != "" {
		_ = writeURLShortcut(filepath.Join(up, "Desktop", "SolarCRM.url"), appURL, icoPath)
	}

	// Start Menu
	startMenuDir := filepath.Join(os.Getenv("PROGRAMDATA"),
		"Microsoft", "Windows", "Start Menu", "Programs", "SolarCRM")
	_ = os.MkdirAll(startMenuDir, 0o755)
	_ = writeURLShortcut(filepath.Join(startMenuDir, "Open SolarCRM.url"), appURL, icoPath)
	_ = writeLnkShortcut(
		filepath.Join(startMenuDir, "Manage Service.lnk"),
		"powershell.exe",
		fmt.Sprintf(`-NoProfile -ExecutionPolicy Bypass -File "%s\scripts\Manage-Service.ps1" -Action status`,
			installDir),
	)

	// Registry — Add/Remove Programs
	regKey := `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\SolarCRM`
	_ = runPS(fmt.Sprintf(`
		$key = '%s'
		New-Item -Path $key -Force | Out-Null
		Set-ItemProperty -Path $key -Name DisplayName      -Value 'SunPower Solar CRM'
		Set-ItemProperty -Path $key -Name DisplayVersion   -Value '%s'
		Set-ItemProperty -Path $key -Name Publisher        -Value 'SunPower Solar'
		Set-ItemProperty -Path $key -Name InstallLocation  -Value '%s'
		Set-ItemProperty -Path $key -Name UninstallString  -Value '"%s\scripts\Uninstall.ps1"'
		Set-ItemProperty -Path $key -Name DisplayIcon      -Value '%s'
		Set-ItemProperty -Path $key -Name NoModify         -Value 1
		Set-ItemProperty -Path $key -Name NoRepair         -Value 1
	`, regKey, appVersion, installDir, installDir, icoPath))

	return nil
}

func writeURLShortcut(path, url, iconPath string) error {
	content := fmt.Sprintf("[InternetShortcut]\r\nURL=%s\r\nIconFile=%s\r\nIconIndex=0\r\n",
		url, iconPath)
	return os.WriteFile(path, []byte(content), 0o644)
}

func writeLnkShortcut(dest, target, args string) error {
	// Use PowerShell's WScript.Shell to create a proper .lnk shortcut
	script := fmt.Sprintf(`
		$ws  = New-Object -ComObject WScript.Shell
		$lnk = $ws.CreateShortcut('%s')
		$lnk.TargetPath = '%s'
		$lnk.Arguments  = '%s'
		$lnk.Save()
	`, dest, target, strings.ReplaceAll(args, "'", "''"))
	return runPS(script)
}

// ── Step: scheduled backup ────────────────────────────────────────────────────

func scheduleBackup() error {
	script := filepath.Join(installDir, "scripts", "Backup-Database.ps1")
	cmd := exec.Command("schtasks", "/create",
		"/tn", "SolarCRM Daily Backup",
		"/tr", fmt.Sprintf(`powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%s"`, script),
		"/sc", "daily",
		"/st", "02:00",
		"/ru", "SYSTEM",
		"/f",
	)
	// Non-fatal — backup schedule is a nice-to-have
	_ = cmd.Run()
	return nil
}

// ── PowerShell helpers ────────────────────────────────────────────────────────

// runPS runs a PowerShell command string, hiding its window. Returns error if exit code != 0.
func runPS(command string) error {
	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w — %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// runPSFile runs a PowerShell script file with the given arguments,
// piping its output to the installer console so the user sees progress.
func runPSFile(script string, args ...string) error {
	psArgs := []string{"-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script}
	psArgs = append(psArgs, args...)
	cmd := exec.Command("powershell", psArgs...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// ── Console UI ────────────────────────────────────────────────────────────────

func printBanner() {
	fmt.Println()
	fmt.Println("  +------------------------------------------+")
	fmt.Println("  |       SolarCRM Installation Wizard       |")
	fmt.Println("  |    Solar Installation Management System  |")
	fmt.Println("  +------------------------------------------+")
	fmt.Println()
}

func printSuccess() {
	fmt.Println()
	fmt.Println("  +------------------------------------------+")
	fmt.Println("  |        Installation Complete!            |")
	fmt.Println("  +------------------------------------------+")
	fmt.Printf( "  |  URL      : http://localhost:%s           |\n", appPort)
	fmt.Println("  |  Email    : admin@solarcrm.com           |")
	fmt.Println("  |  Password : admin123                     |")
	fmt.Println("  +------------------------------------------+")
	fmt.Println("  |  Change your password after first login! |")
	fmt.Println("  +------------------------------------------+")
	fmt.Println()
	fmt.Println("  SolarCRM is now running as a Windows service.")
	fmt.Println("  It will start automatically every time Windows boots.")
}

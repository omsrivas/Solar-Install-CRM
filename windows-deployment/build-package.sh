#!/usr/bin/env bash
# =============================================================================
#  SolarCRM Windows Package Builder
#  Run this on Linux/Replit to produce a distributable package.
#  The resulting zip can be used on Windows to build SolarCRM_Setup.exe.
#
#  Usage: bash windows-deployment/build-package.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/windows-dist"
BUNDLE_DIR="$SCRIPT_DIR/installer/bundle"

echo ""
echo "  ============================================"
echo "   SolarCRM Windows Package Builder"
echo "  ============================================"
echo ""

# ── Step 1: Install dependencies ─────────────────────────────────────────────
echo "  [1/6] Installing dependencies..."
cd "$ROOT_DIR"
pnpm install --frozen-lockfile
echo "  OK"

# ── Step 2: Run codegen ───────────────────────────────────────────────────────
echo ""
echo "  [2/6] Running API codegen..."
pnpm --filter @workspace/api-spec run codegen
echo "  OK"

# ── Step 3: Build frontend for production ────────────────────────────────────
echo ""
echo "  [3/6] Building frontend (React)..."
cd "$ROOT_DIR/artifacts/solar-crm"
# Build with base path = "/" for Windows deployment (served from root)
# PORT is required by vite.config.ts even during build — pass a dummy value
BASE_PATH="/" PORT=1 NODE_ENV=production pnpm run build
echo "  OK — output: artifacts/solar-crm/dist/public/"

# ── Step 4: Build backend ─────────────────────────────────────────────────────
echo ""
echo "  [4/6] Building backend (Express)..."
cd "$ROOT_DIR/artifacts/api-server"
NODE_ENV=production pnpm run build
echo "  OK — output: artifacts/api-server/dist/"

# ── Step 5: Create bundle ────────────────────────────────────────────────────
echo ""
echo "  [5/6] Creating installer bundle..."

# Clean and recreate bundle directory
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/app/dist"
mkdir -p "$BUNDLE_DIR/scripts"
mkdir -p "$BUNDLE_DIR/config"
mkdir -p "$BUNDLE_DIR/assets"
mkdir -p "$BUNDLE_DIR/tools"
mkdir -p "$BUNDLE_DIR/node"

# Copy backend dist
cp -r "$ROOT_DIR/artifacts/api-server/dist/." "$BUNDLE_DIR/app/dist/"
echo "  Copied backend dist"

# Copy frontend into backend's public/ directory (served as static files)
cp -r "$ROOT_DIR/artifacts/solar-crm/dist/public/." "$BUNDLE_DIR/app/dist/public/"
echo "  Copied frontend into backend public/"

# Copy PowerShell scripts
cp "$SCRIPT_DIR/scripts/"*.ps1 "$BUNDLE_DIR/scripts/"
echo "  Copied scripts"

# Copy config templates
cp "$SCRIPT_DIR/config/"* "$BUNDLE_DIR/config/"
echo "  Copied config"

# Create a placeholder license
cat > "$BUNDLE_DIR/assets/license.txt" <<'EOF'
SolarCRM Software License

This software is provided for internal business use only.
All data remains the property of the installing organization.
EOF

echo "  Bundle created at: $BUNDLE_DIR"

# ── Step 6: Create distributable zip ──────────────────────────────────────────
echo ""
echo "  [6/6] Creating distributable archive..."

mkdir -p "$DIST_DIR"
ARCHIVE="$DIST_DIR/SolarCRM-Windows-Package.zip"
rm -f "$ARCHIVE"

cd "$SCRIPT_DIR/.."
zip -r "$ARCHIVE" \
    "windows-deployment/README.md" \
    "windows-deployment/INSTALL-GUIDE.md" \
    "windows-deployment/ADMIN-GUIDE.md" \
    "windows-deployment/BUILD-INSTALLER.md" \
    "windows-deployment/installer/setup.nsi" \
    "windows-deployment/installer/build-installer.bat" \
    "windows-deployment/installer/bundle/" \
    "windows-deployment/scripts/" \
    "windows-deployment/config/" \
    ".github/workflows/build-installer.yml" \
    -x "*.DS_Store" -x "__pycache__/*" -x "*.pyc"

SIZE=$(du -sh "$ARCHIVE" | cut -f1)
echo "  OK — Archive: $ARCHIVE ($SIZE)"

echo ""
echo "  ============================================"
echo "   Build complete!"
echo "  ============================================"
echo ""
echo "  Distributable: $ARCHIVE"
echo ""
echo "  To build SolarCRM_Setup.exe:"
echo "    Option A: Push to GitHub → Actions tab → download artifact"
echo "    Option B: Extract the zip on Windows, run build-installer.bat"
echo ""

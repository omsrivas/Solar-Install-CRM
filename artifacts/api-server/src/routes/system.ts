import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const adminOnly = [requireAuth, requireRole("admin")];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR ?? path.join(process.cwd(), "data", "backups"),
);

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getDiskInfo(): { used: number; free: number; total: number; percentage: number } {
  try {
    // Use df on Linux/NixOS
    const output = execSync("df -Pk / 2>/dev/null | tail -1", {
      timeout: 3000,
      encoding: "utf-8",
    });
    const parts = output.trim().split(/\s+/);
    // df -Pk gives: Filesystem 1024-blocks Used Available Use% Mounted
    const total = Number(parts[1]) * 1024;
    const used = Number(parts[2]) * 1024;
    const free = Number(parts[3]) * 1024;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    return { used, free, total, percentage };
  } catch {
    // Fallback if df not available
    return { used: 0, free: 0, total: 0, percentage: 0 };
  }
}

// ─── GET /system/health ───────────────────────────────────────────────────────

router.get("/system/health", ...adminOnly, async (_request, response) => {
  const start = Date.now();
  let dbStatus = "ok";
  let dbResponseTime = 0;

  try {
    await db.execute(sql`SELECT 1`);
    dbResponseTime = Date.now() - start;
  } catch {
    dbStatus = "error";
  }

  const uptime = process.uptime();
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const memPercentage = Math.round((memUsed / memTotal) * 100);

  const disk = getDiskInfo();

  const status = dbStatus === "ok" ? "ok" : "degraded";

  response.json({
    status,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    database: {
      status: dbStatus,
      responseTime: dbResponseTime,
    },
    memory: {
      used: memUsed,
      total: memTotal,
      percentage: memPercentage,
    },
    disk: {
      used: disk.used,
      free: disk.free,
      percentage: disk.percentage,
    },
    version: process.env.npm_package_version ?? "0.0.0",
  });
});

// ─── GET /backup/list ─────────────────────────────────────────────────────────

router.get("/backup/list", ...adminOnly, (_request, response) => {
  try {
    ensureBackupDir();
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.gz"))
      .map((filename) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, filename));
        return {
          filename,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          sizeFormatted: formatBytes(stat.size),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    response.json(files);
  } catch (err) {
    logger.error({ err }, "Failed to list backups");
    response.status(500).json({ error: "Unable to list backups." });
  }
});

// ─── POST /backup/create ──────────────────────────────────────────────────────

router.post("/backup/create", ...adminOnly, (_request, response) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    response.status(500).json({ error: "DATABASE_URL is not configured." });
    return;
  }

  try {
    ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    execSync(`pg_dump --no-owner --no-acl --format=plain "${dbUrl}" > "${filePath}"`, {
      timeout: 120_000,
      env: { ...process.env },
    });

    const stat = fs.statSync(filePath);
    response.status(201).json({
      filename,
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      sizeFormatted: formatBytes(stat.size),
    });
  } catch (err) {
    logger.error({ err }, "Backup creation failed");
    response.status(500).json({ error: "Backup creation failed. Ensure pg_dump is available." });
  }
});

// ─── POST /backup/restore ─────────────────────────────────────────────────────

router.post("/backup/restore", ...adminOnly, (request, response) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    response.status(500).json({ error: "DATABASE_URL is not configured." });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";

  if (!filename) {
    response.status(400).json({ error: "filename is required." });
    return;
  }

  // Prevent path traversal
  if (filename.includes("/") || filename.includes("..")) {
    response.status(400).json({ error: "Invalid filename." });
    return;
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    response.status(404).json({ error: "Backup file not found." });
    return;
  }

  try {
    execSync(`psql "${dbUrl}" < "${filePath}"`, {
      timeout: 300_000,
      env: { ...process.env },
    });
    response.json({ message: "Backup restored successfully." });
  } catch (err) {
    logger.error({ err }, "Backup restore failed");
    response.status(500).json({ error: "Backup restore failed." });
  }
});

// ─── GET /backup/download/:filename ──────────────────────────────────────────

router.get("/backup/download/:filename", ...adminOnly, (request, response) => {
  const filename = String(request.params.filename);

  // Prevent path traversal
  if (filename.includes("/") || filename.includes("..")) {
    response.status(400).json({ error: "Invalid filename." });
    return;
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    response.status(404).json({ error: "Backup file not found." });
    return;
  }

  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.setHeader("Content-Type", "application/octet-stream");
  response.sendFile(filePath);
});

export default router;

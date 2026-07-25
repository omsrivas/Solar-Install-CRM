import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import { client, db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const adminOnly = [requireAuth, requireRole("admin")];

type BackupScalar =
  | null
  | string
  | number
  | { type: "bigint"; value: string }
  | { type: "blob"; value: string };

type BackupTable = {
  name: string;
  columns: string[];
  rows: BackupScalar[][];
};

type TursoBackup = {
  format: "turso-libsql-json";
  version: 1;
  createdAt: string;
  tables: BackupTable[];
};

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

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function encodeBackupValue(value: unknown): BackupScalar {
  if (value === null || typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return { type: "bigint", value: value.toString() };
  }
  if (value instanceof Uint8Array) {
    return { type: "blob", value: Buffer.from(value).toString("base64") };
  }
  throw new Error(`Unsupported SQLite value type: ${typeof value}`);
}

function decodeBackupValue(value: BackupScalar): string | number | bigint | Uint8Array | null {
  if (value === null || typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (value.type === "bigint") {
    return BigInt(value.value);
  }
  return Uint8Array.from(Buffer.from(value.value, "base64"));
}

function isBackup(value: unknown): value is TursoBackup {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<TursoBackup>;
  return (
    backup.format === "turso-libsql-json" &&
    backup.version === 1 &&
    typeof backup.createdAt === "string" &&
    Array.isArray(backup.tables) &&
    backup.tables.every(
      (table) =>
        Boolean(table) &&
        typeof table.name === "string" &&
        Array.isArray(table.columns) &&
        table.columns.every((column) => typeof column === "string") &&
        Array.isArray(table.rows) &&
        table.rows.every(
          (row) =>
            Array.isArray(row) &&
            row.every((entry) => {
              if (
                entry === null ||
                typeof entry === "string" ||
                typeof entry === "number"
              ) {
                return true;
              }
              if (!entry || typeof entry !== "object") return false;
              const encoded = entry as Record<string, unknown>;
              return (
                (encoded.type === "bigint" || encoded.type === "blob") &&
                typeof encoded.value === "string"
              );
            }),
        ),
    )
  );
}

async function createTursoBackup(): Promise<TursoBackup> {
  const tableResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name",
  );
  const tables: BackupTable[] = [];

  for (const row of tableResult.rows) {
    const tableName = String(row.name);
    const tableResult = await client.execute(
      `PRAGMA table_info(${quoteIdentifier(tableName)})`,
    );
    const columns = tableResult.rows.map((column) => String(column.name));
    const rowsResult = await client.execute(
      `SELECT * FROM ${quoteIdentifier(tableName)}`,
    );

    tables.push({
      name: tableName,
      columns,
      rows: rowsResult.rows.map((row) =>
        columns.map((column) => encodeBackupValue(row[column])),
      ),
    });
  }

  return {
    format: "turso-libsql-json",
    version: 1,
    createdAt: new Date().toISOString(),
    tables,
  };
}

async function restoreTursoBackup(backup: TursoBackup): Promise<void> {
  const currentTables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name",
  );
  const currentTableNames = new Set(
    currentTables.rows.map((row) => String(row.name)),
  );
  const backupTableNames = new Set(backup.tables.map((table) => table.name));

  if (
    currentTableNames.size !== backupTableNames.size ||
    [...currentTableNames].some((name) => !backupTableNames.has(name))
  ) {
    throw new Error("Backup schema does not match the current Turso database.");
  }

  for (const table of backup.tables) {
    if (!currentTableNames.has(table.name)) {
      throw new Error(`Backup contains unknown table: ${table.name}`);
    }
    if (new Set(table.columns).size !== table.columns.length) {
      throw new Error(`Backup contains duplicate columns for table: ${table.name}`);
    }
    if (table.rows.some((row) => row.length !== table.columns.length)) {
      throw new Error(`Backup contains invalid row data for table: ${table.name}`);
    }
  }

  const statements: Array<{
    sql: string;
    args?: Array<string | number | bigint | Uint8Array | null>;
  }> = [];

  for (const table of [...backup.tables].reverse()) {
    statements.push({ sql: `DELETE FROM ${quoteIdentifier(table.name)}` });
  }

  for (const table of backup.tables) {
    if (table.rows.length === 0) continue;
    const quotedTable = quoteIdentifier(table.name);
    const quotedColumns = table.columns.map(quoteIdentifier).join(", ");
    const placeholders = table.columns.map(() => "?").join(", ");

    for (const row of table.rows) {
      statements.push({
        sql: `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${placeholders})`,
        args: row.map(decodeBackupValue),
      });
    }
  }

  await client.batch(
    [
      { sql: "PRAGMA foreign_keys = OFF" },
      ...statements,
      { sql: "PRAGMA foreign_keys = ON" },
    ],
    "write",
  );
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
    await db.run(sql`SELECT 1`);
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
      .filter((f) => f.endsWith(".json"))
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

router.post("/backup/create", ...adminOnly, async (_request, response) => {
  try {
    ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    const backup = await createTursoBackup();
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");

    const stat = fs.statSync(filePath);
    response.status(201).json({
      filename,
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      sizeFormatted: formatBytes(stat.size),
    });
  } catch (err) {
    logger.error({ err }, "Backup creation failed");
    response.status(500).json({ error: "Backup creation failed." });
  }
});

// ─── POST /backup/restore ─────────────────────────────────────────────────────

router.post("/backup/restore", ...adminOnly, async (request, response) => {
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
    const backup = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    if (!isBackup(backup)) {
      response.status(400).json({ error: "Invalid Turso backup file." });
      return;
    }
    await restoreTursoBackup(backup);
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

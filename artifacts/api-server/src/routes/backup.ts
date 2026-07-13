import { Router, type IRouter } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router: IRouter = Router();

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "data", "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function parseDbUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || "5432", user: u.username, password: u.password, database: u.pathname.slice(1) };
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

router.get("/backup/list", async (_req, res): Promise<void> => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".sql") || f.endsWith(".dump"))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.birthtime.toISOString(), sizeFormatted: formatBytes(stat.size) };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(files);
  } catch {
    res.json([]);
  }
});

router.post("/backup/create", async (_req, res): Promise<void> => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not configured" }); return; }
  const db = parseDbUrl(dbUrl);
  if (!db) { res.status(500).json({ error: "Invalid DATABASE_URL" }); return; }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  try {
    const env = { ...process.env, PGPASSWORD: db.password };
    // On Windows, pg_dump.exe is in PostgreSQL bin dir; on Linux/Replit use pg_dump
    const pgDump = process.platform === "win32"
      ? `"${process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\16\\bin"}\\pg_dump.exe"`
      : "pg_dump";
    await execAsync(
      `${pgDump} -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${filePath}" --no-password`,
      { env }
    );
    const stat = fs.statSync(filePath);
    res.json({ filename, size: stat.size, createdAt: stat.birthtime.toISOString(), sizeFormatted: formatBytes(stat.size) });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: `Backup failed: ${(err as Error).message}` });
  }
});

router.post("/backup/restore", async (req, res): Promise<void> => {
  const { filename } = req.body as { filename?: string };
  if (!filename) { res.status(400).json({ error: "filename is required" }); return; }

  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Backup file not found" }); return; }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not configured" }); return; }
  const db = parseDbUrl(dbUrl);
  if (!db) { res.status(500).json({ error: "Invalid DATABASE_URL" }); return; }

  try {
    const env = { ...process.env, PGPASSWORD: db.password };
    const psql = process.platform === "win32"
      ? `"${process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\16\\bin"}\\psql.exe"`
      : "psql";
    await execAsync(
      `${psql} -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${filePath}" --no-password`,
      { env }
    );
    res.json({ message: `Database restored from ${safeFilename}` });
  } catch (err) {
    res.status(500).json({ error: `Restore failed: ${(err as Error).message}` });
  }
});

router.get("/backup/download/:filename", async (req, res): Promise<void> => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.download(filePath, safeFilename);
});

export { formatUptime, BACKUP_DIR };
export default router;

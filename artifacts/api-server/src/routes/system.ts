import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { BACKUP_DIR, formatUptime } from "./backup.js";

const router: IRouter = Router();
const VERSION = "2.0.0";

router.get("/system/health", async (_req, res): Promise<void> => {
  const uptime = process.uptime();
  const mem = process.memoryUsage();

  // Test DB connectivity
  let dbConnected = false;
  let dbResponseMs = 0;
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    dbResponseMs = Date.now() - start;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  // Disk: backup count and size
  let backupCount = 0;
  let backupSizeMb = 0;
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".sql") || f.endsWith(".dump"));
    backupCount = files.length;
    backupSizeMb = files.reduce((sum, f) => {
      try { return sum + fs.statSync(path.join(BACKUP_DIR, f)).size / (1024 * 1024); } catch { return sum; }
    }, 0);
  } catch { /* ignore */ }

  res.json({
    status: dbConnected ? "healthy" : "degraded",
    uptime,
    uptimeFormatted: formatUptime(uptime),
    database: { connected: dbConnected, responseMs: dbResponseMs },
    memory: {
      heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      externalMb: Number((mem.external / 1024 / 1024).toFixed(2)),
      rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
    },
    disk: { backupCount, backupSizeMb: Number(backupSizeMb.toFixed(2)) },
    version: VERSION,
  });
});

export default router;

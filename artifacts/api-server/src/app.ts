import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

// In production (Windows deployment), allow specific origins or all origins on the LAN.
// CORS is less critical when the backend serves the frontend directly.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({
  credentials: allowedOrigin !== "*",
  origin: allowedOrigin === "*" ? true : allowedOrigin,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// --- Static file serving for production (Windows deployment) ---
// The frontend build output is copied to dist/public/ by the build-package script.
const publicDir = path.resolve(__dirname, "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
  }));
  // SPA fallback: serve index.html for any non-API route
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const indexHtml = path.join(publicDir, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
} else {
  // Development mode: no static serving, return 404 for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.status(404).json({ error: "Not found — run the frontend separately in development" });
  });
}

export default app;

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

// Allow specific origins, or all origins if none configured.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({
  credentials: allowedOrigin !== "*",
  origin: allowedOrigin === "*" ? true : allowedOrigin,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Non-API routes: the frontend is served by its own artifact/dev server in
// this project, so the API server only needs to return 404 for anything
// outside /api.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;

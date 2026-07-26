import { logger } from "./lib/logger";
import { validateFirebaseConfiguration } from "./auth/firebase";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function validateEnvironment(): void {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  if (process.env.NODE_ENV === "production" &&
      !process.env.CORS_ALLOWED_ORIGINS?.trim()) {
    throw new Error(
      "CORS_ALLOWED_ORIGINS must be configured in production as a comma-separated origin allowlist.",
    );
  }
}

async function start(): Promise<void> {
  validateEnvironment();
  validateFirebaseConfiguration();
  const [{ default: app }, { verifyDatabaseConnection }] = await Promise.all([
    import("./app"),
    import("@workspace/db"),
  ]);
  await verifyDatabaseConnection();
  logger.info("Turso database connection verified");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Server startup failed");
  process.exit(1);
});

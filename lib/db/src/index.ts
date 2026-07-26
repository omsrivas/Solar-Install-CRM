import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "TURSO_DATABASE_URL must be set. Provide a Turso database URL.",
  );
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "TURSO_AUTH_TOKEN must be set. Provide a Turso authentication token.",
  );
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { client };

export async function verifyDatabaseConnection(): Promise<void> {
  await client.execute("SELECT 1");
}

export * from "./schema";
export * from "./activities";
export * from "./documents";
export * from "./inventory";
export * from "./leads";
export * from "./payments";
export * from "./projects";
export * from "./reports";
export * from "./service-calls";
export * from "./settings";
export * from "./users";

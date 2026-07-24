import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./activities";
export * from "./documents";
export * from "./inventory";
export * from "./leads";
export * from "./payments";
export * from "./projects";
export * from "./service-calls";
export * from "./settings";
export * from "./users";

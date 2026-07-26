/**
 * bootstrap-admin.ts
 *
 * One-time CLI script to promote an existing CRM user to the "admin" role.
 * Run this directly from the server environment when no admin exists yet.
 *
 * Usage (from the repo root):
 *   pnpm --filter @workspace/scripts run bootstrap-admin -- <firebase-uid-or-email>
 *
 * Requirements:
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in the environment.
 *   - The target Firebase account must already have a CRM user record
 *     (i.e. they must have logged in at least once, or been created via the DB).
 *   - This script exits with code 1 if an admin already exists, preventing
 *     accidental role escalation after the system is live.
 *
 * This script is intentionally NOT exposed via any HTTP endpoint.
 */

import { getDb } from "@workspace/db";
import { users } from "@workspace/db";
import { eq, count } from "drizzle-orm";

async function main() {
  const identifier = process.argv[2]?.trim();
  if (!identifier) {
    console.error(
      "Usage: pnpm --filter @workspace/scripts run bootstrap-admin -- <firebase-uid-or-email>"
    );
    process.exit(1);
  }

  const db = getDb();

  // Safety check: refuse to run if any admin already exists.
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"));

  if (adminCount > 0) {
    console.error(
      `\n❌  Bootstrap refused: ${adminCount} admin(s) already exist in the database.\n` +
      `   To change a user's role, log in as an existing admin and use the Users page.\n`
    );
    process.exit(1);
  }

  // Find the target user by Firebase UID or email.
  const isEmail = identifier.includes("@");
  const [target] = await db
    .select()
    .from(users)
    .where(
      isEmail ? eq(users.email, identifier.toLowerCase()) : eq(users.firebaseUid, identifier)
    )
    .limit(1);

  if (!target) {
    console.error(
      `\n❌  No CRM user found for "${identifier}".\n` +
      `   The user must log in once (or be created in the DB) before being promoted.\n`
    );
    process.exit(1);
  }

  // Promote to admin.
  await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.id, target.id));

  console.log(
    `\n✅  Successfully promoted user to admin:\n` +
    `   Name:  ${target.name}\n` +
    `   Email: ${target.email}\n` +
    `   UID:   ${target.firebaseUid}\n`
  );
}

main().catch((err: unknown) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

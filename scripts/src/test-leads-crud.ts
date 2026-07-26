/**
 * test-leads-crud.ts
 *
 * End-to-end CRUD test for the Leads module.
 * Creates a temporary Firebase admin user, gets an ID token,
 * exercises all Leads endpoints, then cleans up test data.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run test-leads-crud
 *
 * Required env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN,
 *               FIREBASE_SERVICE_ACCOUNT_JSON, VITE_FIREBASE_API_KEY
 */

import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { users } from "@workspace/db";

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:80/api";
const TEST_EMAIL = "test-leads-crud@solar-crm-test.internal";
const TEST_PASSWORD = "TestPass123!";
const WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY!;

// ── Firebase Admin init ───────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!) as ServiceAccount;
const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
const auth: Auth = getAuth(app);

// ── Turso / Drizzle (direct — not via API) ────────────────────────────────────

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema: { users } });

// ── Helpers ───────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(label: string) {
  console.log(`  ✅  ${label}`);
  pass++;
}

function ko(label: string, detail?: unknown) {
  console.error(`  ❌  ${label}`, detail ?? "");
  fail++;
  failures.push(label);
}

async function ensureFirebaseUser(): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(TEST_EMAIL);
    console.log(`Firebase user already exists: ${existing.uid}`);
    return existing.uid;
  } catch {
    const created = await auth.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: "Test Admin (auto)",
    });
    console.log(`Created Firebase user: ${created.uid}`);
    return created.uid;
  }
}

async function getIdToken(uid: string): Promise<string> {
  // 1. Create a custom token via Admin SDK
  const customToken = await auth.createCustomToken(uid);

  // 2. Exchange custom token → ID token via Firebase REST API
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  const { idToken } = (await res.json()) as { idToken: string };
  return idToken;
}

async function ensureDbAdmin(uid: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, uid))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.firebaseUid, uid));
      console.log("Promoted existing DB user to admin");
    } else {
      console.log("DB user already admin");
    }
  } else {
    await db.insert(users).values({
      firebaseUid: uid,
      name: "Test Admin",
      email: TEST_EMAIL,
      role: "admin",
    });
    console.log("Created DB admin user");
  }
}

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testAuth(token: string) {
  console.log("\n── Auth check ─────────────────────────────────────────────");
  const { status, data } = await api("GET", "/auth/me", token);
  if (status === 200) {
    const u = data as { role: string; email: string };
    if (u.role === "admin") {
      ok(`GET /auth/me → admin (${u.email})`);
    } else {
      ko(`GET /auth/me → unexpected role: ${u.role}`);
    }
  } else {
    ko(`GET /auth/me returned ${status}`, data);
  }
}

async function testLeadsCRUD(token: string): Promise<number | null> {
  console.log("\n── Leads CRUD ─────────────────────────────────────────────");
  let createdId: number | null = null;

  // 1. CREATE
  {
    const { status, data } = await api("POST", "/leads", token, {
      customerName: "Ramesh Gupta",
      mobileNumber: "9876543210",
      address: "12 Solar Colony, Jaipur",
      city: "Jaipur",
      email: "ramesh@example.com",
      leadSource: "referral",
      stage: "new",
      remarks: "Interested in 5kW rooftop system",
      followUpDate: "2026-08-01",
      followUpStatus: "pending",
    });
    if (status === 201) {
      const lead = data as { id: number; customerName: string };
      createdId = lead.id;
      ok(`POST /leads → created id=${lead.id} name="${lead.customerName}"`);
    } else {
      ko(`POST /leads returned ${status}`, data);
    }
  }

  if (!createdId) {
    ko("Skipping remaining tests — create failed");
    return null;
  }

  // 2. READ LIST
  {
    const { status, data } = await api("GET", "/leads", token);
    if (status === 200) {
      const list = data as unknown[];
      const found = list.some((l: unknown) => (l as { id: number }).id === createdId);
      if (found) {
        ok(`GET /leads → list contains created lead (total ${list.length})`);
      } else {
        ko(`GET /leads → created lead id=${createdId} not in list of ${list.length}`);
      }
    } else {
      ko(`GET /leads returned ${status}`, data);
    }
  }

  // 3. READ ONE
  {
    const { status, data } = await api("GET", `/leads/${createdId}`, token);
    if (status === 200) {
      const lead = data as { id: number; customerName: string; city: string };
      if (lead.id === createdId && lead.city === "Jaipur") {
        ok(`GET /leads/${createdId} → correct record returned`);
      } else {
        ko(`GET /leads/${createdId} → unexpected data`, lead);
      }
    } else {
      ko(`GET /leads/${createdId} returned ${status}`, data);
    }
  }

  // 4. UPDATE (PATCH)
  {
    const { status, data } = await api("PATCH", `/leads/${createdId}`, token, {
      city: "Jodhpur",
      stage: "contacted",
      remarks: "Updated: called back, very interested",
    });
    if (status === 200) {
      const lead = data as { city: string; stage: string };
      if (lead.city === "Jodhpur" && lead.stage === "contacted") {
        ok(`PATCH /leads/${createdId} → city and stage updated correctly`);
      } else {
        ko(`PATCH /leads/${createdId} → unexpected response`, lead);
      }
    } else {
      ko(`PATCH /leads/${createdId} returned ${status}`, data);
    }
  }

  // 5. RE-READ to confirm persistence
  {
    const { status, data } = await api("GET", `/leads/${createdId}`, token);
    if (status === 200) {
      const lead = data as { city: string; stage: string };
      if (lead.city === "Jodhpur" && lead.stage === "contacted") {
        ok(`GET /leads/${createdId} after PATCH → changes persisted in Turso ✓`);
      } else {
        ko(`Persistence check failed — data doesn't match`, lead);
      }
    } else {
      ko(`GET /leads/${createdId} (post-patch) returned ${status}`, data);
    }
  }

  // 6. FOLLOW-UP patch
  {
    const { status, data } = await api(
      "PATCH",
      `/leads/${createdId}/followup`,
      token,
      { followUpDate: "2026-08-10", followUpStatus: "done" },
    );
    if (status === 200) {
      const lead = data as { followUpStatus: string; followUpDate: string };
      if (lead.followUpStatus === "done" && lead.followUpDate === "2026-08-10") {
        ok(`PATCH /leads/${createdId}/followup → follow-up updated`);
      } else {
        ko(`PATCH /leads/${createdId}/followup → unexpected response`, lead);
      }
    } else {
      ko(`PATCH /leads/${createdId}/followup returned ${status}`, data);
    }
  }

  // 7. ADD NOTE
  {
    const { status, data } = await api(
      "POST",
      `/leads/${createdId}/notes`,
      token,
      { note: "Customer confirmed interest in PMSGY subsidy" },
    );
    if (status === 201) {
      const note = data as { id: number; note: string };
      ok(`POST /leads/${createdId}/notes → note id=${note.id} created`);
    } else {
      ko(`POST /leads/${createdId}/notes returned ${status}`, data);
    }
  }

  // 8. LIST NOTES
  {
    const { status, data } = await api(
      "GET",
      `/leads/${createdId}/notes`,
      token,
    );
    if (status === 200) {
      const notes = data as unknown[];
      if (notes.length >= 1) {
        ok(`GET /leads/${createdId}/notes → ${notes.length} note(s) returned`);
      } else {
        ko(`GET /leads/${createdId}/notes → expected notes, got empty list`);
      }
    } else {
      ko(`GET /leads/${createdId}/notes returned ${status}`, data);
    }
  }

  // 9. SUMMARY endpoint
  {
    const { status, data } = await api("GET", "/leads/summary", token);
    if (status === 200) {
      ok(`GET /leads/summary → ${JSON.stringify(data)}`);
    } else {
      ko(`GET /leads/summary returned ${status}`, data);
    }
  }

  // 10. FILTER by stage
  {
    const { status, data } = await api(
      "GET",
      "/leads?stage=contacted",
      token,
    );
    if (status === 200) {
      const list = data as unknown[];
      const found = list.some((l: unknown) => (l as { id: number }).id === createdId);
      if (found) {
        ok(`GET /leads?stage=contacted → filter works, lead found`);
      } else {
        ko(`GET /leads?stage=contacted → created lead not in filtered results`);
      }
    } else {
      ko(`GET /leads?stage=contacted returned ${status}`, data);
    }
  }

  // 11. DELETE
  {
    const { status } = await api("DELETE", `/leads/${createdId}`, token);
    if (status === 204) {
      ok(`DELETE /leads/${createdId} → 204 No Content`);
    } else {
      ko(`DELETE /leads/${createdId} returned ${status}`);
    }
  }

  // 12. CONFIRM deleted (should 404)
  {
    const { status } = await api("GET", `/leads/${createdId}`, token);
    if (status === 404) {
      ok(`GET /leads/${createdId} after DELETE → 404 (confirmed deleted)`);
    } else {
      ko(`GET /leads/${createdId} after DELETE → expected 404, got ${status}`);
    }
  }

  return createdId;
}

async function testValidation(token: string) {
  console.log("\n── Validation / error handling ────────────────────────────");

  // Missing required fields
  {
    const { status } = await api("POST", "/leads", token, {
      customerName: "NoPhone",
    });
    if (status === 400) {
      ok("POST /leads without mobileNumber → 400");
    } else {
      ko(`POST /leads missing mobileNumber → expected 400, got ${status}`);
    }
  }

  // Non-existent lead
  {
    const { status } = await api("GET", "/leads/99999999", token);
    if (status === 404) {
      ok("GET /leads/99999999 → 404 not found");
    } else {
      ko(`GET /leads/99999999 → expected 404, got ${status}`);
    }
  }

  // Bad ID
  {
    const { status } = await api("GET", "/leads/abc", token);
    if (status === 400) {
      ok("GET /leads/abc → 400 invalid ID");
    } else {
      ko(`GET /leads/abc → expected 400, got ${status}`);
    }
  }

  // Unauthenticated
  {
    const res = await fetch(`${API_BASE}/leads`, { method: "GET" });
    if (res.status === 401) {
      ok("GET /leads without token → 401 Unauthorized");
    } else {
      ko(`GET /leads without token → expected 401, got ${res.status}`);
    }
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup(uid: string) {
  console.log("\n── Cleanup ────────────────────────────────────────────────");
  try {
    await db.delete(users).where(eq(users.firebaseUid, uid));
    console.log("  Removed test DB user");
  } catch (e) {
    console.warn("  Could not remove test DB user:", e);
  }
  try {
    await auth.deleteUser(uid);
    console.log("  Removed Firebase test user");
  } catch (e) {
    console.warn("  Could not remove Firebase test user:", e);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Solar CRM — Leads Module CRUD Test");
  console.log("═══════════════════════════════════════════════════════════");

  if (!WEB_API_KEY) throw new Error("VITE_FIREBASE_API_KEY not set");
  if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL not set");
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");

  let uid: string | null = null;
  try {
    console.log("\n── Setup ──────────────────────────────────────────────────");
    uid = await ensureFirebaseUser();
    await ensureDbAdmin(uid);
    const token = await getIdToken(uid);
    console.log("Firebase ID token obtained ✓");

    await testAuth(token);
    await testLeadsCRUD(token);
    await testValidation(token);
  } finally {
    if (uid) await cleanup(uid);
    client.close();
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(` Results: ${pass} passed, ${fail} failed`);
  if (failures.length > 0) {
    console.error(" FAILURES:");
    failures.forEach((f) => console.error(`   • ${f}`));
  }
  console.log("═══════════════════════════════════════════════════════════\n");

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

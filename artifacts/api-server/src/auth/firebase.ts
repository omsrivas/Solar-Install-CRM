import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let firebaseAuth: Auth | undefined;

function getFirebaseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must be configured for Firebase token verification.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).project_id !== "string" ||
    typeof (parsed as Record<string, unknown>).client_email !== "string" ||
    typeof (parsed as Record<string, unknown>).private_key !== "string"
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.",
    );
  }

  return parsed as ServiceAccount;
}

export function validateFirebaseConfiguration(): void {
  getFirebaseServiceAccount();
}

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(getFirebaseServiceAccount()),
    });

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}
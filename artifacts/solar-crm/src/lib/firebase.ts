import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase Web SDK config values come exclusively from Vite environment
// variables. Set all VITE_FIREBASE_* variables in your .env file (dev) or
// hosting environment (production). The app will throw at startup if any
// required variable is missing rather than silently using stale hardcoded
// values — this makes misconfiguration visible immediately.
//
// Note: Firebase Web SDK keys are intentionally client-side; security is
// enforced via Firebase Security Rules and server-side token verification,
// not by keeping config private.

function requireEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Set it in your .env file or hosting environment before starting the app.`,
    );
  }
  return value;
}

export const firebaseConfig = {
  apiKey:            requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain:        requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             requireEnv("VITE_FIREBASE_APP_ID"),
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

// Guard against double-init in HMR / strict mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

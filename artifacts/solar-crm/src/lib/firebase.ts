import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase Web SDK config is intentionally public — security is enforced via
// Firebase Security Rules, not by keeping this object private. It is visible
// in the Firebase console and in every client-side bundle regardless.
//
// Env-var overrides allow per-environment targeting (e.g. staging project).
// Hardcoded fallbacks ensure the production build works even when VITE_*
// vars are not injected at build time (external CI runners, etc.).
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "AIzaSyDihDO2Mlz8FvCH3tuU1IFXOCsKmQnV8Xc",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "hitech-crm-f6400.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "hitech-crm-f6400",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "hitech-crm-f6400.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "666562869253",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "1:666562869253:web:2fe0e9617f9b02bc8a846c",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? "G-944HKPF5FV",
};

// Guard against double-init in HMR / strict mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

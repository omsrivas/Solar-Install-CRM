import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase Web SDK config — these values are intentionally public.
// They ship in every browser bundle and are secured via Firebase Security Rules
// and server-side token verification, not by keeping them private.
// Env vars (VITE_FIREBASE_*) override the defaults below if set.
export const firebaseConfig = {
  apiKey:            (import.meta.env.VITE_FIREBASE_API_KEY            as string) || "AIzaSyDihDO2Mlz8FvCH3tuU1IFXOCsKmQnV8Xc",
  authDomain:        (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string) || "hitech-crm-f6400.firebaseapp.com",
  projectId:         (import.meta.env.VITE_FIREBASE_PROJECT_ID         as string) || "hitech-crm-f6400",
  storageBucket:     (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string) || "hitech-crm-f6400.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "666562869253",
  appId:             (import.meta.env.VITE_FIREBASE_APP_ID             as string) || "1:666562869253:web:2fe0e9617f9b02bc8a846c",
  measurementId:     (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     as string) || "G-944HKPF5FV",
};

// Guard against double-init in HMR / strict mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

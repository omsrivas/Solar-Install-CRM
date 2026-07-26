import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  setStoredToken,
  setStoredTokenProvider,
} from "@/lib/tokenStore";

interface AuthContextValue {
  /** Authenticated Firebase user, or null if signed out */
  firebaseUser: FirebaseUser | null;
  /** True while Firebase is still resolving the persisted session on load */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const setupListener = () => {
      // onIdTokenChanged fires on:
      //   • initial auth state resolution (sign-in / sign-out on load)
      //   • every automatic token refresh (~55-minute cycle)
      unsubscribe = onIdTokenChanged(auth, async (user) => {
        if (user) {
          // Register Firebase's live token provider before publishing the
          // user. API requests can then await getIdToken() even if they start
          // while this auth callback is still resolving.
          setStoredTokenProvider(() => user.getIdToken());
          try {
            setStoredToken(await user.getIdToken());
          } catch {
            setStoredToken(null);
          }
        } else {
          setStoredTokenProvider(null);
          setStoredToken(null);
        }
        setFirebaseUser(user);
        setLoading(false);
      });
    };

    // Explicitly use localStorage so the session survives page refresh and
    // reconnect. Firebase defaults to IndexedDB which is blocked in some
    // iframe / browser environments, causing silent fallback to in-memory
    // persistence (wiped on every refresh).
    setPersistence(auth, browserLocalPersistence)
      .then(setupListener)
      .catch(setupListener); // still subscribe even if persistence change fails

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Publish the token before exposing the authenticated user. Firebase can
    // resolve signInWithEmailAndPassword before onIdTokenChanged has finished
    // its async callback, so the first protected request must not race token
    // initialization.
    setStoredTokenProvider(() => user.getIdToken());
    setStoredToken(await user.getIdToken());
    setFirebaseUser(user);
    setLoading(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    // onIdTokenChanged fires with null → clears token store
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

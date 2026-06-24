import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import useAuthStore from '../stores/authStore.js';

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

/** Shared auth instance — import this wherever you need Firebase Auth methods. */
export const auth = getAuth(app);

/**
 * Start the Firebase auth listener. Call once at app startup (main.jsx).
 * Uses onIdTokenChanged so the stored token stays fresh after silent refreshes.
 * Returns the unsubscribe function.
 */
export function initAuthListener() {
  return onIdTokenChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const idToken = await firebaseUser.getIdToken();
      useAuthStore.getState().setUser(firebaseUser, idToken);
    } else {
      useAuthStore.getState().setUnauthenticated();
    }
  });
}

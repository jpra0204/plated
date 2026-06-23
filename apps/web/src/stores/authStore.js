import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * authStore — global authentication state.
 *
 * Shape mirrors ARCHITECTURE.md §8.
 * Persisted to localStorage so the session survives a page refresh
 * (the token is re-validated on the next API call anyway).
 *
 * Usage:
 *   const { user, token, status } = useAuthStore();
 *   const { setUser, clearAuth } = useAuthStore();
 */

const useAuthStore = create(
  persist(
    (set) => ({
      // ── State ────────────────────────────────────────────────────────────────

      /** Firebase user object (uid, email, displayName, photoURL) or null */
      user: null,

      /** Firebase ID token — injected into every API request via lib/api.js */
      token: null,

      /** 'loading' while Firebase resolves initial auth state, then 'authenticated' | 'unauthenticated' */
      status: 'loading',

      /** App-side profile fetched from POST /api/v1/auth/sync */
      profile: null,

      /** Stored before auth redirect so the user lands back on their intended page */
      intendedDestination: null,

      // ── Actions ──────────────────────────────────────────────────────────────

      /**
       * Called after a successful Firebase sign-in.
       * @param {{ uid: string, email: string, displayName: string|null, photoURL: string|null }} firebaseUser
       * @param {string} idToken
       */
      setUser: (firebaseUser, idToken) =>
        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? null,
            photoURL: firebaseUser.photoURL ?? null,
          },
          token: idToken,
          status: 'authenticated',
        }),

      /**
       * Called after POST /api/v1/auth/sync resolves with the app profile.
       * @param {object} profile
       */
      setProfile: (profile) => set({ profile }),

      /**
       * Called when Firebase reports no signed-in user (initial load complete).
       */
      setUnauthenticated: () => set({ status: 'unauthenticated' }),

      /**
       * Store the path the user was trying to reach before being redirected to auth.
       * @param {string|null} destination
       */
      setIntendedDestination: (destination) => set({ intendedDestination: destination }),

      /**
       * Called on sign-out — wipes all auth state.
       */
      clearAuth: () =>
        set({ user: null, token: null, profile: null, status: 'unauthenticated', intendedDestination: null }),
    }),
    {
      name: 'plated-auth',
      storage: createJSONStorage(() => localStorage),
      // Don't persist status — always start as 'loading' until Firebase resolves
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        profile: state.profile,
        intendedDestination: state.intendedDestination,
      }),
    }
  )
);

export default useAuthStore;

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * authStore — global authentication state.
 *
 * Shape mirrors the Firebase user object plus our app-side profile.
 * Persisted to localStorage so the session survives a page refresh
 * (the token is re-validated on the next API call anyway).
 *
 * Usage:
 *   const { user, token, isLoading } = useAuthStore();
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

      /** True while Firebase is resolving the initial auth state on load */
      isLoading: true,

      /** App-side profile fetched from POST /api/v1/auth/sync */
      profile: null,

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
          isLoading: false,
        }),

      /**
       * Called after POST /api/v1/auth/sync resolves with the app profile.
       * @param {object} profile
       */
      setProfile: (profile) => set({ profile }),

      /**
       * Called when Firebase reports no signed-in user (initial load complete).
       */
      setLoading: (isLoading) => set({ isLoading }),

      /**
       * Called on sign-out — wipes all auth state.
       */
      clearAuth: () => set({ user: null, token: null, profile: null, isLoading: false }),
    }),
    {
      name: 'plated-auth',
      storage: createJSONStorage(() => localStorage),
      // Don't persist isLoading — always start as true until Firebase resolves
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        profile: state.profile,
      }),
    }
  )
);

export default useAuthStore;

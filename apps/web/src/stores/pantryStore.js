import { create } from 'zustand';

/**
 * pantryStore — local UI state for the pantry feature.
 *
 * Server-side pantry data is fetched and cached by TanStack Query
 * (see hooks/usePantry.js when implemented). This store holds ephemeral
 * client-only state: the voice-capture session, optimistic additions, etc.
 *
 * TODO: implement actions as the Pantry page is built out.
 */

const usePantryStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────

  /** Items captured in the current voice session, before confirmation */
  pendingVoiceItems: [],

  /** Whether the voice-capture UI is open */
  isVoiceSessionActive: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Open the voice capture session */
  startVoiceSession: () => set({ isVoiceSessionActive: true, pendingVoiceItems: [] }),

  /** Add a parsed item to the pending list (before the user confirms) */
  addPendingItem: (item) =>
    set((state) => ({ pendingVoiceItems: [...state.pendingVoiceItems, item] })),

  /** Remove a specific pending item (user deselects before confirming) */
  removePendingItem: (index) =>
    set((state) => ({
      pendingVoiceItems: state.pendingVoiceItems.filter((_, i) => i !== index),
    })),

  /** Close the voice session without saving */
  cancelVoiceSession: () => set({ isVoiceSessionActive: false, pendingVoiceItems: [] }),

  /** Called after confirmed items have been sent to the API */
  commitVoiceSession: () => set({ isVoiceSessionActive: false, pendingVoiceItems: [] }),
}));

export default usePantryStore;

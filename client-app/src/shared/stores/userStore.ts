import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  username?: string;
  isAuthenticated: boolean;
  expiresAt?: number;
  isGuest?: boolean;
}

export interface UserStore {
  user: User;
  setUser: (user: Partial<User>) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
  isSessionExpired: () => boolean;
  isGuestUser: () => boolean;
  evictExpiredSession: () => void;
}

const initialUserState: User = {
  id: "",
  email: "",
  username: "",
  isAuthenticated: false,
  isGuest: false,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: initialUserState,

      // Honour whatever the caller passes. Hard-coding `isAuthenticated: true`
      // here meant a partial update — `setUser({ username })` after a rename —
      // promoted a cleared store back to authenticated, so a rename that
      // resolved after a logout left the UI logged in with an empty id and
      // every subsequent request 401ing.
      setUser: (userData: Partial<User>) =>
        set((state) => ({
          user: {
            ...state.user,
            ...userData,
            isAuthenticated:
              userData.isAuthenticated ?? state.user.isAuthenticated,
          },
        })),

      clearUser: () =>
        set(() => ({
          user: initialUserState,
        })),
      // A pure predicate. It used to call clearUser() — a set() — and every
      // call site invokes it inside JSX, so an expired guest triggered a store
      // write during React's render phase. Eviction now happens in an effect
      // at the app root; this only reports.
      isAuthenticated: () => {
        const user = get().user;
        if (!user.isAuthenticated) return false;
        return !get().isSessionExpired();
      },

      isSessionExpired: () => {
        const { expiresAt } = get().user;
        return expiresAt ? expiresAt < Date.now() : false;
      },

      // Called from an effect when the persisted session has aged out, and by
      // the HTTP layer when the server rejects us with a 401.
      evictExpiredSession: () => {
        const state = get();
        if (state.user.isAuthenticated && state.isSessionExpired()) {
          state.clearUser();
        }
      },

      isGuestUser: () => get().user.isGuest === true,
    }),
    {
      name: "user-storage",
    },
  ),
);

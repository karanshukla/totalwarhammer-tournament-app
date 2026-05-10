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

interface UserStore {
  user: User;
  setUser: (user: Partial<User>) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
  isSessionExpired: () => boolean;
  isGuestUser: () => boolean;
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

      setUser: (userData: Partial<User>) =>
        set((state) => ({
          user: {
            ...state.user,
            ...userData,
            isAuthenticated: true,
          },
        })),

      clearUser: () =>
        set(() => ({
          user: initialUserState,
        })),
      isAuthenticated: () => {
        const user = get().user;
        if (!user.isAuthenticated) return false;

        if (
          get().isSessionExpired() ||
          (user.expiresAt && user.expiresAt < Date.now())
        ) {
          get().clearUser();
          return false;
        }

        return true;
      },

      isSessionExpired: () => {
        const { expiresAt } = get().user;
        return expiresAt ? expiresAt < Date.now() : false;
      },

      isGuestUser: () => get().user.isGuest === true,
    }),
    {
      name: "user-storage",
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  isAuthenticated: boolean;
}

interface UserStore {
  user: User;
  setUser: (user: Partial<User>) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
}

const initialUserState: User = {
  id: '',
  email: '',
  isAuthenticated: false,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: initialUserState,
      
      setUser: (userData: Partial<User>) => 
        set(state => ({
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
      
      isAuthenticated: () => get().user.isAuthenticated,
    }),
    {
      name: 'user-storage',
    }
  )
);

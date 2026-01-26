import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  surname?: string;
  phone?: string;
  email?: string;
  role?: string;
  points_balance?: number;
  type: 'customer' | 'staff';
  branch?: string; // For staff users
  user_type?: 'customer' | 'employee' | 'staff' | 'investor' | 'media';
  total_spend?: number;
  total_purchases_count?: number;
  created_at?: string;
  birthday?: string;
  gender?: string;
  company?: string;
  customer_id?: string;
  company_id?: number;
  is_company_verified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,

      setAuth: (user, token) => {
        set({ user, token });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      updateUser: (userData) => {
        set((state) => {
          if (!state.user) return state;
          const updatedUser = { ...state.user, ...userData };
          return { user: updatedUser };
        });
      },

      setHasHydrated: (state) => {
        set({ hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

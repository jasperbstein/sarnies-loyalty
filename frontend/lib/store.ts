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
  type: 'customer' | 'staff' | 'employee';
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

// Track if we've attempted hydration to avoid duplicate attempts
let hydrationAttempted = false;

// Force hydration to complete - call this if stuck
export const forceHydration = () => {
  if (!useAuthStore.getState().hasHydrated) {
    useAuthStore.getState().setHasHydrated(true);
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,

      setAuth: (user, token) => {
        // Normalize user_type to a single field (single source of truth)
        const normalizedUser = {
          ...user,
          user_type: user.user_type || user.type || 'customer',
        };
        set({ user: normalizedUser, token });
        // Also set cookie for middleware auth check (client-side only)
        if (typeof document !== 'undefined') {
          const userType = normalizedUser.user_type;
          document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
          document.cookie = `user-type=${userType}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        // Clear auth cookies (client-side only)
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'user-type=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          // Clear saved login email so PIN modal doesn't show
          localStorage.removeItem('last_login_email');
        }
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
        hydrationAttempted = true;
        // Ensure hydration happens even if state is somehow undefined
        if (state) {
          state.setHasHydrated(true);
        } else {
          // Fallback: manually set hydrated after a short delay
          setTimeout(() => {
            useAuthStore.getState().setHasHydrated(true);
          }, 100);
        }
      },
    }
  )
);

// Auto-force hydration after 500ms if it hasn't happened yet
// This is a safety net for mobile Safari and other edge cases
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!useAuthStore.getState().hasHydrated) {
      console.warn('[Auth Store] Forcing hydration after timeout');
      useAuthStore.getState().setHasHydrated(true);
    }
  }, 500);
}

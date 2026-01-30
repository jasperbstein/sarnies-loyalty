import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './store';

// Mock document.cookie
const mockCookies: Record<string, string> = {};
Object.defineProperty(document, 'cookie', {
  get: () => Object.entries(mockCookies).map(([k, v]) => `${k}=${v}`).join('; '),
  set: (value: string) => {
    const [pair] = value.split(';');
    const [key, val] = pair.split('=');
    if (val === '' || value.includes('expires=Thu, 01 Jan 1970')) {
      delete mockCookies[key];
    } else {
      mockCookies[key] = val;
    }
  },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({ user: null, token: null, hasHydrated: false });
    // Clear mocks
    Object.keys(mockCookies).forEach(key => delete mockCookies[key]);
    localStorageMock.clear();
  });

  describe('setAuth', () => {
    it('sets user and token', () => {
      const user = { id: 1, name: 'John', type: 'customer' as const };
      const token = 'test-token';

      useAuthStore.getState().setAuth(user, token);

      const state = useAuthStore.getState();
      expect(state.user).toBeTruthy();
      expect(state.user?.name).toBe('John');
      expect(state.token).toBe('test-token');
    });

    it('normalizes user_type from type field', () => {
      const user = { id: 1, name: 'John', type: 'employee' as const };

      useAuthStore.getState().setAuth(user, 'token');

      const state = useAuthStore.getState();
      expect(state.user?.user_type).toBe('employee');
    });

    it('preserves user_type when already present', () => {
      const user = {
        id: 1,
        name: 'John',
        type: 'customer' as const,
        user_type: 'staff' as const,
      };

      useAuthStore.getState().setAuth(user, 'token');

      const state = useAuthStore.getState();
      expect(state.user?.user_type).toBe('staff');
    });

    it('defaults user_type to customer when no type fields', () => {
      const user = { id: 1, name: 'John', type: undefined as unknown as 'customer' };

      useAuthStore.getState().setAuth(user, 'token');

      const state = useAuthStore.getState();
      expect(state.user?.user_type).toBe('customer');
    });

    it('sets auth-token cookie', () => {
      const user = { id: 1, name: 'John', type: 'customer' as const };

      useAuthStore.getState().setAuth(user, 'token');

      expect(mockCookies['auth-token']).toBe('true');
    });

    it('sets user-type cookie with normalized type', () => {
      const user = { id: 1, name: 'John', type: 'employee' as const };

      useAuthStore.getState().setAuth(user, 'token');

      expect(mockCookies['user-type']).toBe('employee');
    });
  });

  describe('logout', () => {
    it('clears user and token', () => {
      // Setup logged in state
      useAuthStore.setState({
        user: { id: 1, name: 'John', type: 'customer' },
        token: 'test-token',
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('clears auth cookies', () => {
      // Setup cookies
      mockCookies['auth-token'] = 'true';
      mockCookies['user-type'] = 'customer';

      useAuthStore.getState().logout();

      expect(mockCookies['auth-token']).toBeUndefined();
      expect(mockCookies['user-type']).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('updates user fields', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'John', type: 'customer', points_balance: 100 },
        token: 'token',
      });

      useAuthStore.getState().updateUser({ points_balance: 200 });

      const state = useAuthStore.getState();
      expect(state.user?.points_balance).toBe(200);
      expect(state.user?.name).toBe('John'); // Other fields preserved
    });

    it('does nothing when no user is logged in', () => {
      useAuthStore.setState({ user: null, token: null });

      useAuthStore.getState().updateUser({ points_balance: 200 });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('setHasHydrated', () => {
    it('sets hasHydrated flag', () => {
      expect(useAuthStore.getState().hasHydrated).toBe(false);

      useAuthStore.getState().setHasHydrated(true);

      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });
  });
});

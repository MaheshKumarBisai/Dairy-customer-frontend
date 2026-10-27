import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, authApi, type UserProfile, type UserRole } from '@dairy/shared';
import { router } from 'expo-router';
import { customerSession } from '../bootstrap';

const REQUIRED_ROLE: UserRole = 'CUSTOMER';

interface CustomerAuthValue {
  /** True while the initial session check is running. */
  booting: boolean;
  authenticated: boolean;
  profile: UserProfile | null;
  roleMismatch: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  reloadProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(() => customerSession.getUser<UserProfile>());
  const [roleMismatch, setRoleMismatch] = useState(false);

  const logout = useCallback(() => {
    customerSession.clear();
    setProfile(null);
    setRoleMismatch(false);
    router.replace('/login');
  }, []);

  const bootstrap = useCallback(async () => {
    if (!customerSession.isAuthenticated()) {
      setProfile(null);
      setBooting(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      if (me.role !== REQUIRED_ROLE) {
        // Backend is authoritative for roles — never downgrade to client logic.
        customerSession.clear();
        setProfile(null);
        setRoleMismatch(true);
      } else {
        setProfile(me);
        customerSession.setUser(me);
      }
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        customerSession.clear();
        setProfile(null);
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      customerSession.setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      // Re-read identity/role from the backend instead of trusting login payload.
      const me = await authApi.getMe();
      if (me.role !== REQUIRED_ROLE) {
        customerSession.clear();
        throw new ApiError(
          403,
          'ROLE_MISMATCH',
          'This account is not a Customer account. Use the right DairyFresh app for this role.',
        );
      }
      customerSession.setUser(me);
      setProfile(me);
      setRoleMismatch(false);
      return me;
    },
    [],
  );

  const reloadProfile = useCallback(async () => {
    const me = await authApi.getMe();
    setProfile(me);
    customerSession.setUser(me);
  }, []);

  const value = useMemo<CustomerAuthValue>(
    () => ({
      booting,
      authenticated: customerSession.isAuthenticated() || Boolean(profile),
      profile,
      roleMismatch,
      login,
      logout,
      reloadProfile,
    }),
    [booting, profile, roleMismatch, login, logout, reloadProfile],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthValue {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  return context;
}

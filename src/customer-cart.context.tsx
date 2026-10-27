import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartApi, type CartResponse } from '@dairy/shared';
import { useCustomerAuth } from './auth/customer-auth.context';
import { customerSession } from './bootstrap';

interface CustomerCartValue {
  cart: CartResponse | null;
  itemCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CustomerCartContext = createContext<CustomerCartValue | null>(null);

/** Keeps the customer cart (and the nav badge) in sync after mutations. */
export function CustomerCartProvider({ children }: { children: ReactNode }) {
  const { authenticated, booting } = useCustomerAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!customerSession.isAuthenticated()) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const next = await cartApi.getCart();
      setCart(next);
    } catch {
      // Cart stays empty on failure; screens surface their own errors.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (booting) return;
    if (!authenticated) {
      setCart(null);
      return;
    }
    void refresh();
  }, [booting, authenticated, refresh]);

  const value = useMemo<CustomerCartValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      loading,
      refresh,
    }),
    [cart, loading, refresh],
  );

  return <CustomerCartContext.Provider value={value}>{children}</CustomerCartContext.Provider>;
}

export function useCustomerCart(): CustomerCartValue {
  const context = useContext(CustomerCartContext);
  if (!context) throw new Error('useCustomerCart must be used inside CustomerCartProvider');
  return context;
}

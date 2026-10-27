import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  favoritesApi,
  storageRead,
  storageWrite,
  type Product,
} from '@dairy/shared';
import { useCustomerAuth } from './auth/customer-auth.context';
import { customerSession } from './bootstrap';

const FAVOURITES_STORAGE_KEY = 'dairy.customer.favourites.v2';

interface CustomerFavouritesValue {
  favourites: Product[];
  favouriteCount: number;
  loading: boolean;
  isFavourite: (productId: string) => boolean;
  toggleFavourite: (product: Product) => Promise<boolean>;
  removeFavourite: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerFavouritesContext = createContext<CustomerFavouritesValue | null>(null);

/** Enterprise-grade persistent favourites provider with instant local hydration & cloud sync */
export function CustomerFavouritesProvider({ children }: { children: ReactNode }) {
  const { authenticated, booting } = useCustomerAuth();
  const [favourites, setFavourites] = useState<Product[]>(() => {
    try {
      const saved = storageRead(FAVOURITES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore parse error */
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Sync state to local storage whenever favourites change
  const persistFavourites = useCallback((items: Product[]) => {
    try {
      storageWrite(FAVOURITES_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage write error */
    }
  }, []);

  const favouriteIdSet = useMemo(() => {
    return new Set(favourites.map((p) => p.productId));
  }, [favourites]);

  const isFavourite = useCallback(
    (productId: string) => {
      return favouriteIdSet.has(productId);
    },
    [favouriteIdSet],
  );

  const refresh = useCallback(async () => {
    if (!customerSession.isAuthenticated()) return;
    setLoading(true);
    try {
      const serverItems = await favoritesApi.getFavorites();
      if (Array.isArray(serverItems)) {
        setFavourites(serverItems);
        persistFavourites(serverItems);
      }
    } catch {
      // Keep existing local favourites if server request fails
    } finally {
      setLoading(false);
    }
  }, [persistFavourites]);

  // Sync with server on auth ready
  useEffect(() => {
    if (booting) return;
    if (authenticated) {
      void refresh();
    }
  }, [booting, authenticated, refresh]);

  const toggleFavourite = useCallback(
    async (product: Product): Promise<boolean> => {
      const current = favouriteIdSet.has(product.productId);
      const willBeSaved = !current;

      let updated: Product[];
      if (willBeSaved) {
        // Prepend new favourite
        updated = [product, ...favourites.filter((p) => p.productId !== product.productId)];
      } else {
        // Remove favourite
        updated = favourites.filter((p) => p.productId !== product.productId);
      }

      setFavourites(updated);
      persistFavourites(updated);

      // Async cloud sync if authenticated
      if (customerSession.isAuthenticated()) {
        try {
          if (willBeSaved) {
            await favoritesApi.addFavorite(product.productId);
          } else {
            await favoritesApi.removeFavorite(product.productId);
          }
        } catch {
          // Cloud sync failure handled gracefully without disrupting local UX
        }
      }

      return willBeSaved;
    },
    [favouriteIdSet, favourites, persistFavourites],
  );

  const removeFavourite = useCallback(
    async (productId: string) => {
      const updated = favourites.filter((p) => p.productId !== productId);
      setFavourites(updated);
      persistFavourites(updated);

      if (customerSession.isAuthenticated()) {
        try {
          await favoritesApi.removeFavorite(productId);
        } catch {
          /* ignore */
        }
      }
    },
    [favourites, persistFavourites],
  );

  const value = useMemo<CustomerFavouritesValue>(
    () => ({
      favourites,
      favouriteCount: favourites.length,
      loading,
      isFavourite,
      toggleFavourite,
      removeFavourite,
      refresh,
    }),
    [favourites, loading, isFavourite, toggleFavourite, removeFavourite, refresh],
  );

  return (
    <CustomerFavouritesContext.Provider value={value}>
      {children}
    </CustomerFavouritesContext.Provider>
  );
}

export function useCustomerFavourites(): CustomerFavouritesValue {
  const ctx = useContext(CustomerFavouritesContext);
  if (!ctx) {
    throw new Error('useCustomerFavourites must be used within a CustomerFavouritesProvider');
  }
  return ctx;
}

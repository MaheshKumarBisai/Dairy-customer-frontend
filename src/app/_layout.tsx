import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ToastProvider, colors, hydrateStorage } from '@dairy/shared';
import { configureCustomerApp } from '../bootstrap';
import { CustomerAuthProvider } from '../auth/customer-auth.context';
import { CustomerFavouritesProvider } from '../customer-favourites.context';
import { CustomerCartProvider } from '../customer-cart.context';
import { DailyMilkLaunchReveal } from '../components/daily-milk-launch-reveal';
import { CustomerBottomNav } from '../components/customer-bottom-nav';

// Immediately dismiss any Expo Go native placeholder screen so the user only sees the logo
void SplashScreen.hideAsync().catch(() => undefined);

/** In-memory flag ensuring the reveal animation plays once on fresh app open (cleared from recent apps)
 *  and doesn't repeat on internal screen transitions. */
let hasShownAppLaunch = false;

/** Constant bottom navigation bar kept pinned at root layout so it never slides when screens transition */
function PersistentCustomerNav() {
  const pathname = usePathname();
  const isTabScreen =
    pathname === '/home' ||
    pathname === '/favourites' ||
    pathname === '/orders' ||
    pathname === '/profile';

  if (!isTabScreen) return null;
  return <CustomerBottomNav />;
}

/** Root layout: configure transport/storage, play charming full-screen Daily Milk logo reveal on open,
 *  hydrate the session, then transition to splash (if guest) or home (if authenticated). */
export default function CustomerRootLayout() {
  const [ready, setReady] = useState(false);
  const [revealDone, setRevealDone] = useState(hasShownAppLaunch);

  useEffect(() => {
    let cancelled = false;
    try {
      configureCustomerApp();
    } catch {
      /* transport can be reconfigured later */
    }
    void hydrateStorage()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          void SplashScreen.hideAsync().catch(() => undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When app is opened fresh from recent apps, play full-screen Daily Milk logo reveal
  if (!revealDone || !ready) {
    return (
      <SafeAreaProvider>
        <DailyMilkLaunchReveal
          onFinish={() => {
            hasShownAppLaunch = true;
            setRevealDone(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <CustomerAuthProvider>
        <CustomerFavouritesProvider>
          <CustomerCartProvider>
            <ToastProvider>
              <StatusBar style="auto" />
              <View style={{ flex: 1, backgroundColor: colors.bg }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                    animationDuration: 280,
                  }}
                />
                <PersistentCustomerNav />
              </View>
            </ToastProvider>
          </CustomerCartProvider>
        </CustomerFavouritesProvider>
      </CustomerAuthProvider>
    </SafeAreaProvider>
  );
}

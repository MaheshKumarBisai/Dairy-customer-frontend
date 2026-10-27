import { configureHttp, createSessionStore, storageRead, storageWrite } from '@dairy/shared';
import { router } from 'expo-router';
import { configureAppStorage } from './storage';

/** Customer app bootstrap — wires the shared transport to this app's own
 *  namespaced session. Only the public API base URL is configured here. */
export const customerSession = createSessionStore('dairy.customer');

/** Idempotent. Configures persistence (localStorage or AsyncStorage) and the
 *  HTTP layer; safe to call from the root layout effect. */
export function configureCustomerApp(): void {
  configureAppStorage();
  configureHttp({
    session: customerSession,
    onUnauthorized: () => {
      // Session died (expired/revoked) — drop the user to login.
      try {
        router.replace('/login');
      } catch {
        /* router not mounted yet */
      }
    },
  });
}

export const ONBOARDED_KEY = 'dairy.customer.onboarded';

export function hasSeenOnboarding(): boolean {
  return storageRead(ONBOARDED_KEY) === '1';
}

export function markOnboardingSeen(): void {
  storageWrite(ONBOARDED_KEY, '1');
}

import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { LoadingState } from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useCustomerAuth } from './customer-auth.context';

/** Private customer routes: wait for the session check, then gate on auth. */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { booting, authenticated } = useCustomerAuth();

  if (booting) {
    return <LoadingState label="Preparing your DairyFresh session…" />;
  }
  if (!authenticated) {
    return <Redirect href={customerRoutes.login} />;
  }
  return <>{children}</>;
}

/** Public-only routes (login/signup/onboarding): bounce signed-in users home. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { booting, authenticated } = useCustomerAuth();

  if (booting) {
    return <LoadingState label="Preparing your DairyFresh session…" />;
  }
  if (authenticated) {
    return <Redirect href={customerRoutes.home} />;
  }
  return <>{children}</>;
}

import { PublicOnly } from '../auth/customer-guard';
import { CustomerOnboardingScreen } from '../screens/customer-onboarding';

export default function CustomerOnboardingScreenRoute() {
  return (
    <PublicOnly>
      <CustomerOnboardingScreen />
    </PublicOnly>
  );
}

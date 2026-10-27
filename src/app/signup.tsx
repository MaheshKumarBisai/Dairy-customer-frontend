import { PublicOnly } from '../auth/customer-guard';
import { CustomerSignupScreen } from '../screens/customer-signup';

export default function CustomerSignupScreenRoute() {
  return (
    <PublicOnly>
      <CustomerSignupScreen />
    </PublicOnly>
  );
}

import { PublicOnly } from '../auth/customer-guard';
import { CustomerLoginScreen } from '../screens/customer-login';

export default function CustomerLoginScreenRoute() {
  return (
    <PublicOnly>
      <CustomerLoginScreen />
    </PublicOnly>
  );
}

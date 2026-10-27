import { RequireCustomer } from '../auth/customer-guard';
import { CustomerCheckoutScreen } from '../screens/customer-checkout';

export default function CustomerCheckoutScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerCheckoutScreen />
    </RequireCustomer>
  );
}

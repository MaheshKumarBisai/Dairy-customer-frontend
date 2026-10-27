import { RequireCustomer } from '../auth/customer-guard';
import { CustomerHomeScreen } from '../screens/customer-home';

export default function CustomerHomeScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerHomeScreen />
    </RequireCustomer>
  );
}

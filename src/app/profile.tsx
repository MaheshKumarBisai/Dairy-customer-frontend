import { RequireCustomer } from '../auth/customer-guard';
import { CustomerProfileScreen } from '../screens/customer-profile';

export default function CustomerProfileScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerProfileScreen />
    </RequireCustomer>
  );
}

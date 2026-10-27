import { RequireCustomer } from '../auth/customer-guard';
import { CustomerAddressesScreen } from '../screens/customer-addresses';

export default function CustomerAddressesScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerAddressesScreen />
    </RequireCustomer>
  );
}

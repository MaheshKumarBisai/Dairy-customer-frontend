import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerOrdersScreen } from '../../screens/customer-orders';

export default function CustomerOrdersScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerOrdersScreen />
    </RequireCustomer>
  );
}

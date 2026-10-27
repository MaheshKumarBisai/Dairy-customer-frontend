import { RequireCustomer } from '../auth/customer-guard';
import { CustomerCartScreen } from '../screens/customer-cart';

export default function CustomerCartScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerCartScreen />
    </RequireCustomer>
  );
}

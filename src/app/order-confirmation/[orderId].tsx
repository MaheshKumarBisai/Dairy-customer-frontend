import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerOrderConfirmationScreen } from '../../screens/customer-order-confirmation';

export default function CustomerOrderConfirmationScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerOrderConfirmationScreen />
    </RequireCustomer>
  );
}

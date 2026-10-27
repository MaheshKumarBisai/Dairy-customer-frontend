import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerOrderTrackingScreen } from '../../screens/customer-order-tracking';

export default function CustomerOrderTrackingScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerOrderTrackingScreen />
    </RequireCustomer>
  );
}

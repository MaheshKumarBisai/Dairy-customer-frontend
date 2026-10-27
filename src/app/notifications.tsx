import { RequireCustomer } from '../auth/customer-guard';
import { CustomerNotificationsScreen } from '../screens/customer-notifications';

export default function CustomerNotificationsScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerNotificationsScreen />
    </RequireCustomer>
  );
}

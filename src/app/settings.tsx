import { RequireCustomer } from '../auth/customer-guard';
import { CustomerSettingsScreen } from '../screens/customer-settings';

export default function CustomerSettingsScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerSettingsScreen />
    </RequireCustomer>
  );
}

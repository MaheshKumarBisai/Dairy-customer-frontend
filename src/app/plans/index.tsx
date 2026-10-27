import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerDairyPlansScreen } from '../../screens/customer-dairy-plans';

export default function CustomerDairyPlansScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerDairyPlansScreen />
    </RequireCustomer>
  );
}

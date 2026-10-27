import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerCreateDairyPlanScreen } from '../../screens/customer-create-dairy-plan';

export default function CustomerCreateDairyPlanScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerCreateDairyPlanScreen />
    </RequireCustomer>
  );
}

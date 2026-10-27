import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerDairyPlanDetailsScreen } from '../../screens/customer-dairy-plan-details';

export default function CustomerDairyPlanDetailsScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerDairyPlanDetailsScreen />
    </RequireCustomer>
  );
}

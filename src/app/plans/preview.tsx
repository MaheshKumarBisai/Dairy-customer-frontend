import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerPreviewDairyPlanScreen } from '../../screens/customer-preview-dairy-plan';

export default function CustomerPreviewDairyPlanScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerPreviewDairyPlanScreen />
    </RequireCustomer>
  );
}


import { RequireCustomer } from '../auth/customer-guard';
import { CustomerCategoriesScreen } from '../screens/customer-categories';

export default function CustomerCategoriesScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerCategoriesScreen />
    </RequireCustomer>
  );
}

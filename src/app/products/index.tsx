import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerProductListScreen } from '../../screens/customer-product-list';

export default function CustomerProductListScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerProductListScreen />
    </RequireCustomer>
  );
}

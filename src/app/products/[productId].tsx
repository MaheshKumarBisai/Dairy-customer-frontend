import { RequireCustomer } from '../../auth/customer-guard';
import { CustomerProductDetailsScreen } from '../../screens/customer-product-details';

export default function CustomerProductDetailsScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerProductDetailsScreen />
    </RequireCustomer>
  );
}

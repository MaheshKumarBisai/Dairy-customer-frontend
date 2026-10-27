import { RequireCustomer } from '../auth/customer-guard';
import { CustomerPaymentMethodsScreen } from '../screens/customer-payment-methods';

export default function CustomerPaymentMethodsScreenRoute() {
  return (
    <RequireCustomer>
      <CustomerPaymentMethodsScreen />
    </RequireCustomer>
  );
}

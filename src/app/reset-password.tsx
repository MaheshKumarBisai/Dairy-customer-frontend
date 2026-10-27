import { PublicOnly } from '../auth/customer-guard';
import { CustomerResetPasswordScreen } from '../screens/customer-reset-password';

export default function CustomerResetPasswordScreenRoute() {
  return (
    <PublicOnly>
      <CustomerResetPasswordScreen />
    </PublicOnly>
  );
}

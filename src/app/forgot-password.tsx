import { PublicOnly } from '../auth/customer-guard';
import { CustomerForgotPasswordScreen } from '../screens/customer-forgot-password';

export default function CustomerForgotPasswordScreenRoute() {
  return (
    <PublicOnly>
      <CustomerForgotPasswordScreen />
    </PublicOnly>
  );
}

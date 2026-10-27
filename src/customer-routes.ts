/** Central route map for the Customer app (file/screen names stay `customer-*`). */
export const customerRoutes = {
  splash: '/',
  onboarding: '/onboarding',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  home: '/home',
  categories: '/categories',
  products: '/products',
  productDetails: '/products/:productId',
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: '/order-confirmation/:orderId',
  orderTracking: '/orders/:orderId',
  orders: '/orders',
  favourites: '/favourites',
  dairyPlans: '/plans',
  createDairyPlan: '/plans/new',
  previewDairyPlan: '/plans/preview',
  dairyPlanDetails: '/plans/:planId',
  addresses: '/addresses',
  paymentMethods: '/payments',
  notifications: '/notifications',
  profile: '/profile',
  settings: '/settings',
} as const;

export function customerPath(
  route: keyof typeof customerRoutes,
  params?: Record<string, string>,
): string {
  let path: string = customerRoutes[route];
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    });
  }
  return path;
}

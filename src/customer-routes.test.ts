import { describe, expect, it } from 'vitest';
import { customerPath, customerRoutes } from './customer-routes';

describe('customer routes', () => {
  it('exposes every customer screen', () => {
    expect(Object.keys(customerRoutes)).toEqual(
      expect.arrayContaining([
        'splash',
        'onboarding',
        'login',
        'signup',
        'home',
        'categories',
        'products',
        'productDetails',
        'cart',
        'checkout',
        'orderConfirmation',
        'orders',
        'orderTracking',
        'dairyPlans',
        'createDairyPlan',
        'dairyPlanDetails',
        'addresses',
        'paymentMethods',
        'notifications',
        'profile',
        'settings',
      ]),
    );
  });

  it('substitutes route params', () => {
    expect(customerPath('productDetails', { productId: 'prod 1' })).toBe(
      '/products/prod%201',
    );
    expect(customerPath('orderTracking', { orderId: 'ord-9' })).toBe('/orders/ord-9');
    expect(customerPath('home')).toBe('/home');
  });
});

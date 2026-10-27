import { useLocation, useNavigate } from '../router';
import { BottomNav, type NavItem } from '@dairy/shared';
import { customerPath, customerRoutes } from '../customer-routes';
import { useCustomerFavourites } from '../customer-favourites.context';

/**
 * Customer bottom navigation:
 * Simplified to 4 enterprise tabs: Shop · Favourite · Orders · Account.
 * (Explore and Cart removed per user instruction; Cart is now an interactive floating pill CTA & top header pill).
 */
export function CustomerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { favouriteCount } = useCustomerFavourites();

  const items: NavItem[] = [
    { key: 'home', label: 'Shop', icon: 'home' },
    { key: 'favourites', label: 'Favourite', icon: 'heart', badge: favouriteCount },
    { key: 'orders', label: 'Orders', icon: 'truck' },
    { key: 'profile', label: 'Account', icon: 'user' },
  ];

  const normalized = pathname.replace(/\/+$/, '') || '/';
  const activeKey =
    normalized === '/home' || normalized === '/' || normalized === customerRoutes.home
      ? 'home'
      : normalized.startsWith(customerRoutes.favourites)
        ? 'favourites'
        : normalized.startsWith(customerRoutes.orders) || normalized.startsWith('/orders')
          ? 'orders'
          : normalized.startsWith(customerRoutes.profile) ||
              normalized.startsWith(customerRoutes.settings) ||
              normalized.startsWith(customerRoutes.addresses) ||
              normalized.startsWith(customerRoutes.paymentMethods) ||
              normalized.startsWith(customerRoutes.notifications)
            ? 'profile'
            : 'home';

  const onSelect = (key: string) => {
    if (key === activeKey) return;
    switch (key) {
      case 'home':
        navigate(customerPath('home'));
        break;
      case 'favourites':
        navigate(customerPath('favourites'));
        break;
      case 'orders':
        navigate(customerPath('orders'));
        break;
      case 'profile':
        navigate(customerPath('profile'));
        break;
    }
  };

  return <BottomNav items={items} activeKey={activeKey} onSelect={onSelect} />;
}

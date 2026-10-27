import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DairyImage,
  EmptyState,
  formatCurrency,
  Icon,
  cartApi,
  useToast,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerPath, customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerCart } from '../customer-cart.context';
import { useCustomerFavourites } from '../customer-favourites.context';

/** Enterprise-grade Favourites / Wishlist screen with persistent storage, cloud sync, and quick cart actions. */
export function CustomerFavouritesScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, itemCount, refresh: refreshCart } = useCustomerCart();
  const { favourites, removeFavourite, refresh: refreshFavourites, loading } = useCustomerFavourites();

  const [addingId, setAddingId] = useState<string | null>(null);

  const addSingleToCart = async (productId: string, name: string) => {
    if (addingId) return;

    // If product is already in cart, inform customer to adjust quantity in cart
    const isAlreadyInCart = cart?.items?.some((ci) => ci.productId === productId);
    if (isAlreadyInCart) {
      toast.show('Already added to basket! Please adjust quantity in cart.');
      return;
    }

    setAddingId(productId);
    try {
      await cartApi.addToCart({ productId, quantity: 1 });
      await refreshCart();
      toast.success(`${name} added to basket`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add to basket');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (productId: string, name: string) => {
    void name;
    await removeFavourite(productId);
  };

  return (
    <CustomerShell
      headerProps={{
        title: 'Favourite',
        right: (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View basket, ${itemCount} items`}
            onPress={() => navigate(customerRoutes.cart)}
            style={styles.cartBtn}
          >
            <Icon name="cart" size={17} strokeWidth={2.4} color="#121316" />
            <Text style={styles.cartCount}>{itemCount}</Text>
          </Pressable>
        ),
      }}
      onRefresh={refreshFavourites}
      refreshing={loading}
      footer={
        itemCount > 0 ? (
          <View style={styles.footerWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Check out ${itemCount} products`}
              onPress={() => navigate(customerRoutes.cart)}
              style={({ pressed }) => [styles.checkoutBanner, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.checkoutBannerText}>
                Check out {itemCount} {itemCount === 1 ? 'product' : 'products'}
              </Text>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {favourites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No favourites yet"
            description="Explore fresh milk, ghee, paneer, and curd, and tap the heart icon to save products for quick reordering."
            actionLabel="Explore Products"
            onAction={() => navigate(customerRoutes.categories)}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {favourites.map((product, index) => (
            <Pressable
              key={product.productId}
              onPress={() =>
                navigate(customerPath('productDetails', { productId: product.productId }))
              }
              style={({ pressed }) => [
                styles.itemRow,
                index < favourites.length - 1 && styles.itemDivider,
                pressed && { opacity: 0.88 },
              ]}
            >
              {/* Thumbnail */}
              <View style={styles.thumbWrap}>
                <DairyImage
                  src={product.image?.imageUrl}
                  name={product.name}
                  category={product.category?.name}
                  style={styles.thumb}
                />
              </View>

              {/* Details */}
              <View style={styles.details}>
                <Text numberOfLines={1} style={styles.name}>
                  {product.name}
                </Text>
                <Text style={styles.unit}>
                  {product.pricing.unit}, Price
                </Text>
              </View>

              {/* Price & Actions */}
              <View style={styles.actionsRow}>
                <Text style={styles.price}>
                  {formatCurrency(product.pricing.price, product.pricing.currency)}
                </Text>

                {/* Quick Add To Cart Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${product.name} to cart`}
                  hitSlop={6}
                  disabled={addingId === product.productId}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    void addSingleToCart(product.productId, product.name);
                  }}
                  style={({ pressed }) => [
                    styles.quickAddBtn,
                    pressed && { opacity: 0.8 },
                    addingId === product.productId && { opacity: 0.5 },
                  ]}
                >
                  <Icon name="plus" size={16} strokeWidth={2.4} color={colors.white} />
                </Pressable>

                {/* Red Heart Unfavorite Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${product.name} from favourites`}
                  hitSlop={6}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    void handleRemove(product.productId, product.name);
                  }}
                  style={styles.heartBtn}
                >
                  <Icon
                    name="heartFilled"
                    size={20}
                    strokeWidth={0}
                    fill="#E53935"
                    color="#E53935"
                  />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
    ...shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  thumb: {
    flex: 1,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: '#181725',
  },
  unit: {
    ...typography.caption,
    fontSize: 13,
    color: '#7C7C7C',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.greenDark,
  },
  quickAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#141518',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  heartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  footerWrap: {
    paddingHorizontal: 18,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    ...shadows.lime,
  },
  cartCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121316',
  },
  checkoutBanner: {
    backgroundColor: '#141518',
    borderRadius: 24,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.dark,
  },
  checkoutBannerText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
});

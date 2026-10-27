import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  DairyImage,
  Icon,
  cartApi,
  colors,
  formatCurrency,
  radius,
  shadows,
  spacing,
  typography,
  type Product,
} from '@dairy/shared';
import { customerPath } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerCart } from '../customer-cart.context';
import { useCustomerFavourites } from '../customer-favourites.context';


function useAddToCart() {
  const { refresh } = useCustomerCart();
  const [adding, setAdding] = useState(false);

  const add = async (product: Product, quantity = 1): Promise<boolean> => {
    if (adding) return false;
    setAdding(true);
    try {
      await cartApi.addToCart({ productId: product.productId, quantity });
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      setAdding(false);
    }
  };

  return { add, adding };
}

export function useAddToCartAction() {
  return useAddToCart();
}

function StockFlag({ product }: { product: Product }) {
  if (product.availability.stockStatus === 'OUT_OF_STOCK') {
    return (
      <View style={styles.flagWrap}>
        <View style={styles.flagOut}>
          <Text style={styles.flagText}>Out of stock</Text>
        </View>
      </View>
    );
  }
  if (product.availability.stockStatus === 'LOW_STOCK') {
    return (
      <View style={styles.flagWrap}>
        <View style={styles.flagLow}>
          <Text style={styles.flagText}>Only a few left</Text>
        </View>
      </View>
    );
  }
  return null;
}

function AddButton({
  product,
  add,
  adding,
  disabled,
}: {
  product: Product;
  add: (product: Product, quantity?: number) => Promise<boolean>;
  adding: boolean;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${product.name} to cart`}
      disabled={disabled || adding}
      onPress={() => {
        void add(product);
      }}
      style={({ pressed }) => [
        styles.addBtn,
        disabled || adding ? styles.addBtnDisabled : null,
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      {adding ? (
        <Icon name="refresh" size={15} strokeWidth={2.4} color={colors.white} />
      ) : (
        <Icon name="plus" size={17} strokeWidth={2.6} color={colors.white} />
      )}
    </Pressable>
  );
}

/** Grid product card used across Home, Categories and search results. */
export function CustomerProductCard({
  product,
  style,
}: {
  product: Product;
  style?: StyleProp<ViewStyle>;
}) {
  const navigate = useNavigate();
  const { add, adding } = useAddToCart();
  const { isFavourite, toggleFavourite } = useCustomerFavourites();
  const saved = isFavourite(product.productId);
  const disabled =
    product.availability.stockStatus === 'OUT_OF_STOCK' || !product.availability.isAvailable;

  const open = () => navigate(customerPath('productDetails', { productId: product.productId }));

  const onHeartPress = async () => {
    await toggleFavourite(product);
  };

  return (
    <Pressable
      accessibilityLabel={product.name}
      onPress={open}
      style={({ pressed }) => [styles.card, style, pressed ? { opacity: 0.93 } : null]}
    >
      <View style={styles.media}>
        <DairyImage
          src={product.image?.imageUrl}
          name={product.name}
          category={product.category?.name}
          style={styles.mediaImage}
        />
        <StockFlag product={product} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from favourites' : 'Save to favourites'}
          hitSlop={8}
          onPress={() => void onHeartPress()}
          style={[styles.heart, saved && styles.heartActive]}
        >
          <Icon
            name={saved ? 'heartFilled' : 'heart'}
            size={16}
            strokeWidth={saved ? 0 : 2}
            fill={saved ? '#E53935' : undefined}
            color={saved ? '#E53935' : colors.muted}
          />
        </Pressable>
        {product.delivery?.subscriptionAllowed ? (
          <View style={styles.subBadge}>
            <Text style={styles.subBadgeText}>Plan</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {product.pricing.unit}
        </Text>
        <View style={styles.foot}>
          <Text numberOfLines={1} style={styles.price}>
            {formatCurrency(product.pricing.price, product.pricing.currency)}
          </Text>
          <AddButton product={product} add={add} adding={adding} disabled={disabled} />
        </View>
      </View>
    </Pressable>
  );
}

/** Horizontal product row used for compact lists. */
export function CustomerProductRow({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { add, adding } = useAddToCart();
  const disabled =
    product.availability.stockStatus === 'OUT_OF_STOCK' || !product.availability.isAvailable;

  const open = () => navigate(customerPath('productDetails', { productId: product.productId }));

  return (
    <Pressable
      accessibilityLabel={product.name}
      onPress={open}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.92 } : null]}
    >
      <View style={styles.rowMedia}>
        <DairyImage
          src={product.image?.imageUrl}
          name={product.name}
          category={product.category?.name}
          style={styles.rowMediaImage}
        />
      </View>
      <View style={styles.rowMain}>
        <Text numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {product.pricing.unit}
          {product.category?.name ? ` · ${product.category.name}` : ''}
        </Text>
        <Text numberOfLines={2} style={styles.rowCaption}>
          {product.description.slice(0, 74)}
          {product.description.length > 74 ? '…' : ''}
        </Text>
        <View style={styles.foot}>
          <Text numberOfLines={1} style={styles.price}>
            {formatCurrency(product.pricing.price, product.pricing.currency)}
          </Text>
          <AddButton product={product} add={add} adding={adding} disabled={disabled} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.sm,
  },
  media: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.white },
  mediaImage: { flex: 1, borderRadius: 0 },
  flagWrap: { position: 'absolute', top: 8, left: 8 },
  flagOut: {
    backgroundColor: colors.red,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  flagLow: {
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  flagText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  heartActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  subBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.blue + 'DD',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  subBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 3 },
  name: { ...typography.bodyStrong, color: colors.ink, fontSize: 14, minHeight: 36, lineHeight: 18 },
  meta: { ...typography.caption, color: colors.muted },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 0 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  addBtnDisabled: { backgroundColor: colors.muted2 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    ...shadows.sm,
  },
  rowMedia: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  rowMediaImage: { flex: 1, borderRadius: 0 },
  rowMain: { flex: 1, gap: 3 },
  rowCaption: { ...typography.caption, color: colors.muted },
});

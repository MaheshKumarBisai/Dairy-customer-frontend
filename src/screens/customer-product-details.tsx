import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  cartApi,
  catalogApi,
  DairyImage,
  ErrorState,
  formatCurrency,
  Icon,
  LoadingState,
  Notice,
  QuantityStepper,
  useAsync,
  useToast,
  colors,
  shadows,
  spacing,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate, useParams } from '../router';
import { useCustomerCart } from '../customer-cart.context';
import { useCustomerFavourites } from '../customer-favourites.context';

/** 9. Product details — Nectar/Groceries design with big hero media, stepper, accordions, and green Add To Basket button. */
export function CustomerProductDetailsScreen() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { itemCount, refresh } = useCustomerCart();
  const { isFavourite, toggleFavourite } = useCustomerFavourites();

  const [quantity, setQuantity] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = useAsync((signal) => catalogApi.getProduct(productId, signal), [productId], {
    enabled: Boolean(productId),
  });

  if (product.status === 'loading') {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Product', onBack: () => navigate(-1) }}>
        <LoadingState label="Loading product details…" />
      </CustomerShell>
    );
  }

  if (product.status === 'error' || !product.data) {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Product', onBack: () => navigate(-1) }}>
        <ErrorState
          title={product.error?.isNotFound ? 'Product not found' : 'Could not load product'}
          description={product.error?.message}
          code={product.error?.code}
          onRetry={product.reload}
        />
      </CustomerShell>
    );
  }

  const item = product.data;
  const isSaved = isFavourite(item.productId);
  const unavailable =
    item.availability.stockStatus === 'OUT_OF_STOCK' || !item.availability.isAvailable;

  const addToBasket = async () => {
    if (adding || unavailable) return;
    setAdding(true);
    setError(null);
    try {
      await cartApi.addToCart({
        productId: item.productId,
        quantity,
      });
      await refresh();
      toast.success(`${item.name} added to your basket`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not update your cart. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <CustomerShell
      nav={false}
      padded={false}
      background="#ffffff"
    >
      {/* Scrollable Hero Image & Top Bar */}
      <View style={styles.heroWrap}>
        {/* Top navigation bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigate(-1)}
            style={styles.iconBtn}
          >
            <Icon name="chevronLeft" size={24} color="#181725" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${itemCount} items`}
            onPress={() => navigate(customerRoutes.cart)}
            style={styles.cartBtn}
          >
            <Icon name="cart" size={17} strokeWidth={2.4} color="#121316" />
            <Text style={styles.cartCount}>{itemCount}</Text>
          </Pressable>
        </View>

        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <DairyImage
            src={item.image?.imageUrl}
            name={item.name}
            category={item.category?.name}
            eager
            resizeMode="contain"
            style={styles.heroImage}
          />
        </View>
      </View>

      <View style={styles.content}>
        {/* Title & Heart Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.subtitle}>
              {item.pricing.unit}, Price
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from favourites' : 'Save to favourites'}
            onPress={async () => {
              await toggleFavourite(item);
            }}
            hitSlop={8}
            style={[styles.heartBtn, isSaved && styles.heartBtnActive]}
          >
            <Icon
              name={isSaved ? 'heartFilled' : 'heart'}
              size={24}
              strokeWidth={isSaved ? 0 : 2}
              fill={isSaved ? '#E53935' : undefined}
              color={isSaved ? '#E53935' : '#7C7C7C'}
            />
          </Pressable>
        </View>

        {/* Stepper & Price Row */}
        <View style={styles.stepperPriceRow}>
          <QuantityStepper value={quantity} min={1} onChange={setQuantity} />
          <Text style={styles.price}>
            {formatCurrency(item.pricing.price * quantity, item.pricing.currency)}
          </Text>
        </View>

        {error ? (
          <View style={{ marginTop: spacing.md }}>
            <Notice tone="error">{error}</Notice>
          </View>
        ) : null}

        {/* Accordion 1: Product Detail */}
        <View style={styles.accordion}>
          <Pressable
            onPress={() => setDetailsOpen((v) => !v)}
            style={styles.accordionHeader}
          >
            <Text style={styles.accordionTitle}>Product Detail</Text>
            <Icon
              name={detailsOpen ? 'chevronDown' : 'chevronRight'}
              size={18}
              color="#181725"
            />
          </Pressable>
          {detailsOpen ? (
            <Text style={styles.accordionBody}>
              {item.description ||
                'Farm fresh dairy, ethically sourced from registered organic farms and cold-chain handled to retain maximum freshness, taste, and nutrition.'}
            </Text>
          ) : null}
        </View>

        {/* Accordion 2: Nutritions */}
        <View style={styles.accordion}>
          <Pressable
            onPress={() => setNutritionOpen((v) => !v)}
            style={styles.accordionHeader}
          >
            <Text style={styles.accordionTitle}>Nutritions</Text>
            <View style={styles.nutriRight}>
              <View style={styles.nutriBadge}>
                <Text style={styles.nutriBadgeText}>100gr</Text>
              </View>
              <Icon
                name={nutritionOpen ? 'chevronDown' : 'chevronRight'}
                size={18}
                color="#181725"
              />
            </View>
          </Pressable>
          {nutritionOpen ? (
            <Text style={styles.accordionBody}>
              Rich in Calcium, Protein, Vitamin B12, and healthy milk fats. No preservatives or synthetic additives.
            </Text>
          ) : null}
        </View>

        {/* Review rating snippet */}
        <View style={styles.accordion}>
          <View style={styles.accordionHeader}>
            <Text style={styles.accordionTitle}>Review</Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" size={14} color="#F3603F" fill="#F3603F" />
              ))}
            </View>
          </View>
        </View>

        {/* In-flow Action Button (Adjusted for mobile, non-sticky) */}
        <View style={styles.actionWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add To Basket"
            disabled={unavailable || adding}
            onPress={() => void addToBasket()}
            style={({ pressed }) => [
              styles.basketBtn,
              (unavailable || adding) && { opacity: 0.6 },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.basketBtnText}>
              {adding ? 'Adding…' : unavailable ? 'Out of Stock' : 'Add To Basket'}
            </Text>
          </Pressable>

          {itemCount > 0 && (
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
          )}
        </View>
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    backgroundColor: '#ffffff',
    width: '100%',
    paddingTop: spacing.xs,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: spacing.xs,
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: '#ffffff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#181725',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C7C7C',
  },
  heartBtn: {
    padding: 8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  stepperPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#181725',
  },
  accordion: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    paddingVertical: 18,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181725',
  },
  accordionBody: {
    fontSize: 14,
    color: '#7C7C7C',
    lineHeight: 21,
    marginTop: 10,
  },
  nutriRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutriBadge: {
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  nutriBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C7C7C',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  actionWrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  basketBtn: {
    backgroundColor: '#141518',
    borderRadius: 24,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.dark,
  },
  basketBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
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
    marginTop: 12,
    ...shadows.dark,
  },
  checkoutBannerText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
});


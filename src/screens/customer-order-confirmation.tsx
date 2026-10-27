import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ErrorState,
  formatCurrency,
  getDynamicDeliveryEstimate,
  Icon,
  LoadingState,
  ordersApi,
  useAsync,
  colors,
  shadows,
} from '@dairy/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate, useParams } from '../router';

/** 12. Order confirmation — Screen 7 matching "Your Order has been accepted" with green checkmark, marketing freshness promise, and Track Order CTA. */
export function CustomerOrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { orderId = '' } = useParams();
  const navigate = useNavigate();

  const order = useAsync((signal) => ordersApi.getOrder(orderId, signal), [orderId], {
    enabled: Boolean(orderId),
  });

  if (order.status === 'loading') {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Order placed' }}>
        <LoadingState label="Confirming your order…" />
      </CustomerShell>
    );
  }

  if (order.status === 'error' || !order.data) {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'Order placed' }}
        footer={
          <View style={styles.footerWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate(customerRoutes.home)}
              style={styles.trackBtn}
            >
              <Text style={styles.trackBtnText}>Continue Shopping</Text>
            </Pressable>
          </View>
        }
      >
        <ErrorState
          title="We could not load this order"
          description={order.error?.message}
          code={order.error?.code}
          onRetry={order.reload}
        />
      </CustomerShell>
    );
  }

  const data = order.data;
  const estimate = getDynamicDeliveryEstimate(data.createdAt);

  return (
    <CustomerShell
      nav={false}
      padded={false}
      scroll={false}
      footer={
        <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Single prominent primary Track Order CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Track Order"
            onPress={() => navigate(customerPathTracking(data.orderId))}
            style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.trackBtnContent}>
              <Icon name="truck" size={20} color={colors.white} />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </View>
          </Pressable>
        </View>
      }
    >
      <View style={styles.page}>
        {/* Confetti & Illustration Container */}
        <View style={styles.illustrationWrap}>
          {/* Confetti dots / swirls */}
          <View style={[styles.confettiDot, styles.dotBlue]} />
          <View style={[styles.confettiDot, styles.dotOrange]} />
          <View style={[styles.confettiDot, styles.dotRed]} />
          <View style={[styles.confettiDot, styles.dotGreen]} />
          <View style={[styles.confettiDot, styles.dotPurple]} />
          <View style={[styles.confettiRibbon, styles.ribbon1]} />
          <View style={[styles.confettiRibbon, styles.ribbon2]} />

          {/* Big Green Success Check Circle */}
          <View style={styles.checkCircleOuter}>
            <View style={styles.checkCircleInner}>
              <Icon name="check" size={54} strokeWidth={3.2} color={colors.white} />
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.contentWrap}>
          <Text style={styles.title}>Your Order has been{'\n'}accepted</Text>
          <Text style={styles.subtitle}>
            Your farm fresh items are now being prepared at our local dairy partner
          </Text>

          {/* Marketing Value Card: Dynamic Delivery Window + Cold Chain Freshness Guarantee */}
          <View style={styles.marketingCard}>
            <View style={styles.deliverySlotBanner}>
              <Icon name="clock" size={15} color="#16A34A" />
              <Text style={styles.deliverySlotText}>
                Estimated Arrival: <Text style={styles.deliverySlotBold}>{estimate.fullWindow}</Text>
              </Text>
            </View>

            <View style={styles.promiseRow}>
              <View style={styles.promiseBadge}>
                <Text style={styles.promiseBadgeText}>🌱 100% Farm Pure</Text>
              </View>
              <Text style={styles.receiptAmount}>
                {formatCurrency(data.total, data.payment?.currency ?? 'INR')}
              </Text>
            </View>

            <Text style={styles.marketingPerkText}>
              Cold-chain chilled & delivered untouched to safeguard nature's pure nutrition.
            </Text>
          </View>
        </View>
      </View>
    </CustomerShell>
  );
}

function customerPathTracking(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: colors.white,
  },
  illustrationWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 30,
  },
  checkCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EEF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#53B17540',
  },
  checkCircleInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.green,
  },
  confettiDot: {
    position: 'absolute',
    borderRadius: 99,
  },
  dotBlue: {
    width: 10,
    height: 10,
    backgroundColor: '#4A90E2',
    top: 20,
    left: 20,
  },
  dotOrange: {
    width: 8,
    height: 8,
    backgroundColor: '#F8A44C',
    top: 30,
    right: 25,
  },
  dotRed: {
    width: 9,
    height: 9,
    backgroundColor: '#F7A593',
    bottom: 25,
    left: 30,
  },
  dotGreen: {
    width: 11,
    height: 11,
    backgroundColor: '#53B175',
    bottom: 35,
    right: 20,
  },
  dotPurple: {
    width: 7,
    height: 7,
    backgroundColor: '#D3B0E0',
    top: 80,
    left: 0,
  },
  confettiRibbon: {
    position: 'absolute',
    width: 24,
    height: 5,
    borderRadius: 3,
  },
  ribbon1: {
    backgroundColor: '#53B175',
    transform: [{ rotate: '45deg' }],
    top: 10,
    right: 50,
  },
  ribbon2: {
    backgroundColor: '#F8A44C',
    transform: [{ rotate: '-30deg' }],
    bottom: 10,
    left: 50,
  },
  contentWrap: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#181725',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7C7C7C',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  marketingCard: {
    marginTop: 12,
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: '#E2EFE6',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    maxWidth: 330,
    gap: 10,
  },
  deliverySlotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EBF7EE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  deliverySlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    flexShrink: 1,
  },
  deliverySlotBold: {
    fontWeight: '800',
    color: '#0F5132',
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  promiseBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promiseBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#181725',
  },
  marketingPerkText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 16,
  },
  footerWrap: {
    paddingHorizontal: 25,
    paddingBottom: 25,
    backgroundColor: colors.white,
  },
  trackBtn: {
    backgroundColor: '#141518',
    borderRadius: 24,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.dark,
  },
  trackBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },
});

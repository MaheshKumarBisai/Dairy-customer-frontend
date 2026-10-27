import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DairyImage,
  EmptyState,
  ErrorState,
  formatCurrency,
  formatRelative,
  getDynamicDeliveryEstimate,
  getMarketingPromise,
  Icon,
  IconButton,
  ordersApi,
  Skeleton,
  useAsync,
  colors,
  type Order,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerPath, customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';

/** Computes color-coded delivery ETA badge (Today = Green, Tomorrow = Amber, etc.) */
function getOrderEtaBadge(order: Order) {
  if (order.status === 'DELIVERED') {
    const d = new Date(order.deliveryDate || order.updatedAt || order.createdAt);
    const day = isNaN(d.getTime()) ? '' : d.getDate();
    const month = isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short' });
    return {
      fullLabel: day && month ? `Delivered on ${day} ${month}` : 'Delivered',
      bg: '#F3F4F6',
      color: '#4B5563',
      icon: 'check' as const,
    };
  }

  if (order.status === 'CANCELLED') {
    return {
      fullLabel: 'Order Cancelled',
      bg: '#FEE2E2',
      color: '#DC2626',
      icon: 'x' as const,
    };
  }

  if (order.status === 'OUT_FOR_DELIVERY') {
    return {
      fullLabel: 'Out for Delivery · Live',
      bg: '#DCFCE7',
      color: '#15803D',
      icon: 'truck' as const,
    };
  }

  // Dynamic delivery slot computation based on order booking time
  const estimate = getDynamicDeliveryEstimate(order.createdAt);
  if (estimate.isToday) {
    return {
      fullLabel: estimate.etaLabel,
      bg: '#DCFCE7',
      color: '#15803D',
      icon: 'truck' as const,
    };
  }

  return {
    fullLabel: estimate.etaLabel,
    bg: '#FEF3C7',
    color: '#B45309',
    icon: 'clock' as const,
  };
}

/** Constructs customer-friendly product headline (e.g. "A2 Cow Vedic Ghee") */
function getOrderProductHeadline(order: Order): string {
  const items = order.items ?? [];
  if (!items.length) return 'Dairy Order';
  const first = items[0]?.productName || items[0]?.product?.name || 'Dairy Product';
  if (items.length === 1) return first;
  if (items.length === 2) {
    const second = items[1]?.productName || items[1]?.product?.name || '1 more';
    return `${first}, ${second}`;
  }
  return `${first} + ${items.length - 1} more`;
}

/** 13. Orders — modern, intuitive customer order history with tabs and clean design. */
export function CustomerOrdersScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'delivered'>('all');

  const orders = useAsync(
    (signal) => ordersApi.listOrders({ limit: 50 }, signal),
    [],
    { pollIntervalMs: 3000 },
  );

  const allOrders = orders.data?.orders ?? [];

  const activeOrders = useMemo(
    () => allOrders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)),
    [allOrders],
  );

  const deliveredOrders = useMemo(
    () => allOrders.filter((o) => o.status === 'DELIVERED'),
    [allOrders],
  );

  const displayedOrders = useMemo(() => {
    if (activeTab === 'active') return activeOrders;
    if (activeTab === 'delivered') return deliveredOrders;
    return allOrders;
  }, [activeTab, allOrders, activeOrders, deliveredOrders]);

  return (
    <CustomerShell
      headerProps={{
        title: 'Your orders',
        subtitle: orders.data ? `${allOrders.length} total orders` : undefined,
        right: (
          <IconButton
            name="repeat"
            label="Dairy plans"
            onPress={() => navigate(customerRoutes.dairyPlans)}
          />
        ),
      }}
      onRefresh={() => orders.reload()}
      refreshing={orders.refreshing}
    >
      {/* ── Modern Filter Tabs (All / Active / Delivered) ── */}
      <View style={styles.tabsRow}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
          onPress={() => setActiveTab('all')}
          style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({allOrders.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'active' }}
          onPress={() => setActiveTab('active')}
          style={[styles.tabPill, activeTab === 'active' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'delivered' }}
          onPress={() => setActiveTab('delivered')}
          style={[styles.tabPill, activeTab === 'delivered' && styles.tabPillActive]}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>
            Delivered ({deliveredOrders.length})
          </Text>
        </Pressable>
      </View>

      {/* ── Content Area ── */}
      {orders.status === 'loading' ? (
        <View style={styles.stack}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={108} radius={22} />
          ))}
        </View>
      ) : orders.status === 'error' ? (
        <ErrorState
          title="Could not load your orders"
          description={orders.error?.message}
          code={orders.error?.code}
          onRetry={orders.reload}
        />
      ) : displayedOrders.length === 0 ? (
        <EmptyState
          icon="package"
          title={
            activeTab === 'active'
              ? 'No active orders'
              : activeTab === 'delivered'
              ? 'No delivered orders yet'
              : 'No orders yet'
          }
          description={
            activeTab === 'active'
              ? 'You do not have any orders in transit or being packed right now.'
              : 'Once you place your first order it will appear here with live tracking.'
          }
          actionLabel="Start shopping"
          onAction={() => navigate(customerRoutes.products)}
        />
      ) : (
        <View style={styles.stack}>
          {displayedOrders.map((order) => {
            const eta = getOrderEtaBadge(order);
            const productTitle = getOrderProductHeadline(order);
            const primaryItem = order.items[0];
            const isActive = !['DELIVERED', 'CANCELLED'].includes(order.status);
            const totalQuantity = (order.items ?? []).reduce((acc, it) => acc + (it.quantity || 1), 0);

            return (
              <Pressable
                key={order.orderId}
                accessibilityRole="button"
                accessibilityLabel={`Order ${order.orderId}, ${productTitle}`}
                onPress={() =>
                  navigate(customerPath('orderTracking', { orderId: order.orderId }))
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
              >
                {/* ── Left: Product Image / Thumbnail ── */}
                <View style={styles.imageWrap}>
                  <DairyImage
                    src={primaryItem?.product?.imageUrl ?? null}
                    name={primaryItem?.productName ?? 'Dairy'}
                    category={primaryItem?.productName}
                    style={styles.productImage}
                  />
                </View>

                {/* ── Right: Product info, ETA Pill & Track Button ── */}
                <View style={styles.main}>
                  <View style={styles.headerInfo}>
                    <Text numberOfLines={1} style={styles.productTitle}>
                      {productTitle}
                    </Text>
                    <View style={styles.marketingMetaRow}>
                      <Text style={styles.marketingPromiseText}>
                        {getMarketingPromise(order.orderId.charCodeAt(order.orderId.length - 1) || 0)}
                      </Text>
                      <Text style={styles.marketingDot}>·</Text>
                      <Text style={styles.relativeTimeText}>{formatRelative(order.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Modern borderless ETA pill */}
                  <View style={[styles.etaPill, { backgroundColor: eta.bg }]}>
                    <Icon name={eta.icon} size={11} color={eta.color} />
                    <Text numberOfLines={1} style={[styles.etaText, { color: eta.color }]}>
                      {eta.fullLabel}
                    </Text>
                  </View>

                  {/* Bottom Row: Price & High-Contrast Action Pill */}
                  <View style={styles.bottomRow}>
                    <View style={styles.priceCol}>
                      <Text style={styles.price}>{formatCurrency(order.total)}</Text>
                      <Text style={styles.itemsSub}>
                        {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                      </Text>
                    </View>

                    {isActive ? (
                      <View style={styles.trackPill}>
                        <Text style={styles.trackPillText}>Track</Text>
                        <Icon name="chevronRight" size={13} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.detailsPill}>
                        <Text style={styles.detailsPillText}>Details</Text>
                        <Icon name="chevronRight" size={13} color="#141518" />
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  tabPillActive: {
    backgroundColor: '#141518',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  stack: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 22,
  },
  imageWrap: {
    width: 74,
    height: 74,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignSelf: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: 'center',
  },
  headerInfo: {
    gap: 2,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#141518',
    letterSpacing: -0.2,
  },
  marketingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  marketingPromiseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  marketingDot: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  relativeTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginVertical: 1,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    color: '#141518',
  },
  itemsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  trackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#141518',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  trackPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#141518',
  },
});

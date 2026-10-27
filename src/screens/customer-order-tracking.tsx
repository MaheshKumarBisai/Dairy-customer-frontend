import { useRef, useState } from 'react';
import {
  Animated,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Avatar,
  ErrorState,
  formatCurrency,
  haversineKm,
  HorizontalOrderTracker,
  Icon,
  LoadingState,
  MapCanvas,
  ordersApi,
  resolveAddressCoordinates,
  resolveRiderCoordinates,
  useAsync,
  usePolling,
  useToast,
  colors,
  shadows,
} from '@dairy/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomerShell } from '../components/customer-shell';
import { useNavigate, useParams } from '../router';

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED', 'PREPARING']);

/**
 * Customer Order Tracking Screen
 * Swiggy / Zomato Enterprise Standard:
 * - 100% Full-screen interactive Leaflet map behind everything (ZERO gaps)
 * - Multi-touch finger pinch-to-zoom and pan (no +/- buttons)
 * - Gesture & scroll-driven dark bottom sheet (peek state shows ETA & tracker; swipe up expands full details)
 * - Courier card with instant Call & Message triggers
 */
export function CustomerOrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelBusy, setCancelBusy] = useState(false);

  // 3-Level Swiggy / Zomato Bottom Sheet State: 'min' (~86px) | 'peek' (~215px) | 'expanded' (~74% screen)
  const [sheetState, setSheetState] = useState<'min' | 'peek' | 'expanded'>('peek');
  const MIN_HEIGHT = 86;
  const PEEK_HEIGHT = 215;
  const EXPANDED_HEIGHT = Math.min(Math.round(screenHeight * 0.74), 560);

  const animHeight = useRef(new Animated.Value(PEEK_HEIGHT)).current;

  const setSheetMode = (mode: 'min' | 'peek' | 'expanded') => {
    setSheetState(mode);
    const targetHeight = mode === 'min' ? MIN_HEIGHT : mode === 'peek' ? PEEK_HEIGHT : EXPANDED_HEIGHT;
    Animated.spring(animHeight, {
      toValue: targetHeight,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          // Swipe up: min -> peek -> expanded
          setSheetState((curr) => {
            const next = curr === 'min' ? 'peek' : 'expanded';
            setSheetMode(next);
            return next;
          });
        } else if (gestureState.dy > 20) {
          // Swipe down: expanded -> peek -> min (clears space for map!)
          setSheetState((curr) => {
            const next = curr === 'expanded' ? 'peek' : 'min';
            setSheetMode(next);
            return next;
          });
        } else {
          // Tap on handle bar: cycles min -> peek -> expanded -> peek
          setSheetState((curr) => {
            const next = curr === 'min' ? 'peek' : curr === 'peek' ? 'expanded' : 'peek';
            setSheetMode(next);
            return next;
          });
        }
      },
    }),
  ).current;

  const order = useAsync((signal) => ordersApi.getOrder(orderId, signal), [orderId], {
    enabled: Boolean(orderId),
    pollIntervalMs: 2500,
  });
  const reload = order.reload;
  const status = order.data?.status;

  // Rapid refresh while the order is in progress
  usePolling(
    async () => {
      reload();
    },
    2500,
    Boolean(orderId) && (status === undefined || !['DELIVERED', 'CANCELLED', 'FAILED'].includes(status)),
  );

  const data = order.data;

  const cancel = async () => {
    if (!data) return;
    setCancelBusy(true);
    try {
      await ordersApi.cancelOrder(data.orderId, cancelReason);
      toast.show('Order cancelled');
      setCancelling(false);
      order.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel this order.');
    } finally {
      setCancelBusy(false);
    }
  };

  if (order.status === 'loading' && !data) {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Track Order', onBack: () => navigate(-1) }}>
        <LoadingState label="Locating your delivery…" />
      </CustomerShell>
    );
  }

  if (order.status === 'error' || !data) {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Track Order', onBack: () => navigate(-1) }}>
        <ErrorState
          title="Could not load this order"
          description={order.error?.message}
          code={order.error?.code}
          onRetry={order.reload}
        />
      </CustomerShell>
    );
  }

  const partner = data.delivery?.deliveryPartner ?? null;
  const customerCoords = resolveAddressCoordinates(data.address);
  const riderCoords = resolveRiderCoordinates(
    customerCoords,
    partner ? { lat: partner.currentLatitude, lng: partner.currentLongitude } : null,
  );
  const customerLat = customerCoords.lat;
  const customerLng = customerCoords.lng;
  const riderLat = riderCoords.lat;
  const riderLng = riderCoords.lng;

  const delivered = data.status === 'DELIVERED';
  const failed = data.status === 'CANCELLED' || data.status === 'FAILED' || data.delivery?.status === 'FAILED';
  const outForDelivery = data.status === 'OUT_FOR_DELIVERY' || data.delivery?.status === 'OUT_FOR_DELIVERY';

  // Dynamic delivery time calculation based on real distance (default 10 - 20 mins)
  const distanceKm = haversineKm(riderLat, riderLng, customerLat, customerLng);
  const dynamicMinutes = Math.max(10, Math.min(25, Math.round(distanceKm * 2.8 + 6)));
  const etaMinutesText = delivered ? 'Delivered' : `${dynamicMinutes} mins`;

  // Late detection (failed delivery or elapsed duration > 40 min)
  const orderAgeMs = Date.now() - new Date(data.createdAt).getTime();
  const isLate = failed || orderAgeMs > 40 * 60 * 1000;

  // Enterprise color logic: Green (#00E676) for early/on-time, Red (#EF4444) for late
  const etaColor = isLate ? '#EF4444' : '#00E676';

  // Enterprise message logic:
  // If late: "Our delivery will get to you soon • Delayed due to high demand"
  // If early/on-time: standard positive reassurance message
  const statusSubtitle = isLate
    ? 'Our delivery will get to you soon • Delayed due to high demand'
    : delivered
      ? 'Order successfully delivered. Enjoy your fresh dairy!'
      : outForDelivery
        ? 'Your order is already on its way to you!'
        : 'Your fresh dairy bottles are being prepared.';

  const partnerName = partner?.user.name ?? 'Sheri Turner Jr.';
  const partnerPhone = partner?.user.phone ?? '+919876543210';

  const openCall = () => {
    void Linking.openURL(`tel:${partnerPhone}`);
  };
  const openSms = () => {
    void Linking.openURL(`sms:${partnerPhone}`);
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Full-Screen Interactive Leaflet Map (Zero Gaps, Native Pinch-to-Zoom) ──── */}
      <View style={styles.mapFull}>
        <MapCanvas
          style={StyleSheet.absoluteFill}
          origin={{
            lat: riderLat,
            lng: riderLng,
            label: partnerName,
          }}
          originTone="rider"
          destination={{
            lat: customerLat,
            lng: customerLng,
            label: data.address?.title ?? 'Home',
          }}
          destinationTone="home"
        />
      </View>

      {/* ── 2. Floating Top Back Button (Swiggy style) ──── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => navigate(-1)}
        style={[styles.floatingBackBtn, { top: Math.max(insets.top + 10, 20) }]}
      >
        <Icon name="arrowLeft" size={18} color={colors.white} strokeWidth={2.5} />
        <Text style={styles.floatingBackText}>Back</Text>
      </Pressable>

      {/* ── 3. Swiggy / Zomato Gestural Bottom Sheet ──── */}
      <Animated.View style={[styles.bottomSheet, { height: animHeight }]}>
        {/* Grab Handle Header (Responds to Drag / Swipe gestures) */}
        <View {...panResponder.panHandlers} style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        {sheetState === 'min' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand tracking sheet"
            onPress={() => setSheetMode('peek')}
            style={styles.minimizedBar}
          >
            <View style={styles.minBadge}>
              <Icon name="bike" size={13} color="#141518" strokeWidth={2.4} />
              <Text style={styles.minBadgeText}>EN ROUTE</Text>
            </View>
            <Text numberOfLines={1} style={styles.minTitleText}>
              ETA <Text style={{ color: etaColor, fontWeight: '700' }}>{etaMinutesText}</Text> · {statusSubtitle}
            </Text>
            <View style={styles.minChevron}>
              <Icon name="chevronUp" size={15} color="#CCFF00" />
            </View>
          </Pressable>
        ) : (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              if (offsetY > 15 && sheetState === 'peek') {
                setSheetMode('expanded');
              } else if (offsetY <= -15 && sheetState === 'expanded') {
                setSheetMode('peek');
              }
            }}
            scrollEventThrottle={16}
          >
            {/* ETA Header with dynamic time and on-time/early green or late red styling */}
            <View style={styles.etaHeader}>
              <Text style={styles.etaTitle}>
                Estimated delivery time is{' '}
                <Text style={{ color: etaColor, fontWeight: '800' }}>
                  {etaMinutesText}
                </Text>
              </Text>
              <Text style={styles.etaSubtitle}>
                {statusSubtitle}
              </Text>
            </View>

            {/* Horizontal Dotted Tracker */}
            <View style={styles.trackerWrap}>
              <HorizontalOrderTracker
                status={data.status}
                deliveryStatus={data.delivery?.status}
              />
            </View>

            {/* Expanded Content (Courier details, items, address, cancel) */}
            <View style={styles.drawerDivider} />

            {/* Courier Card */}
            <View style={styles.courierCard}>
              <View style={styles.courierAvatarWrap}>
                <Avatar name={partnerName} size={52} />
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.courierInfo}>
                <Text numberOfLines={1} style={styles.courierName}>
                  {partnerName}
                </Text>
                <Text style={styles.courierRole}>
                  Courier · {partner?.vehicleNumber ?? 'Dairy Express'}
                </Text>
              </View>

              {/* Action Buttons: Call & Message */}
              <View style={styles.courierActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Call Courier"
                  onPress={openCall}
                  style={({ pressed }) => [styles.circleActionBtn, pressed && { opacity: 0.8 }]}
                >
                  <Icon name="phone" size={18} color="#141518" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Message Courier"
                  onPress={openSms}
                  style={({ pressed }) => [styles.circleActionBtn, pressed && { opacity: 0.8 }]}
                >
                  <Icon name="message" size={18} color="#141518" />
                  <View style={styles.limeChatDot} />
                </Pressable>
              </View>
            </View>

            {/* Details Box */}
            <View style={styles.detailsBox}>
              <View style={styles.detailsHeaderRow}>
                <Text style={styles.detailsHeaderTitle}>
                  Order #{data.orderId.slice(0, 8)}
                </Text>
                <Text style={styles.detailsHeaderTotal}>
                  {formatCurrency(data.total)}
                </Text>
              </View>

              {data.items.map((item) => (
                <View key={item.id} style={styles.detailsItemRow}>
                  <Text style={styles.detailsItemName} numberOfLines={1}>
                    {item.productName} × {item.quantity}
                  </Text>
                  <Text style={styles.detailsItemPrice}>
                    {formatCurrency(item.totalPrice)}
                  </Text>
                </View>
              ))}

              <View style={styles.detailsDivider} />

              {data.address && (
                <View style={styles.addressLine}>
                  <Text style={styles.addressLineLabel}>Delivering to:</Text>
                  <Text style={styles.addressLineValue}>
                    {data.address.title}, {data.address.addressLine1}
                    {data.address.city ? `, ${data.address.city}` : ''}
                    {data.address.postalCode ? ` ${data.address.postalCode}` : ''}
                  </Text>
                </View>
              )}

              {CANCELLABLE.has(data.status) && (
                <View style={styles.cancelBox}>
                  {cancelling ? (
                    <View style={styles.cancelForm}>
                      <Text style={styles.cancelPrompt}>Reason for cancelling:</Text>
                      <TextInput
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        style={styles.cancelInput}
                        placeholder="e.g. Changed my mind"
                        placeholderTextColor="#7C7C82"
                      />
                      <View style={styles.cancelBtns}>
                        <Pressable
                          onPress={() => setCancelling(false)}
                          style={styles.cancelBackBtn}
                        >
                          <Text style={styles.cancelBackBtnText}>Keep Order</Text>
                        </Pressable>
                        <Pressable
                          onPress={cancel}
                          disabled={cancelBusy}
                          style={styles.cancelConfirmBtn}
                        >
                          <Text style={styles.cancelConfirmText}>
                            {cancelBusy ? 'Cancelling…' : 'Confirm'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setCancelling(true)}
                      style={styles.cancelTrigger}
                    >
                      <Text style={styles.cancelTriggerText}>Cancel Order</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141518',
    position: 'relative',
    overflow: 'hidden',
  },
  mapFull: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EBECEE',
    zIndex: 1,
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1F23',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 20,
    ...shadows.md,
  },
  floatingBackText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#18191A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 10,
    overflow: 'hidden',
    ...shadows.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#3E414A',
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  minBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  minBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#141518',
    letterSpacing: 0.5,
  },
  minTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  minChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#26292E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  etaHeader: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 5,
  },
  etaTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  etaSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9E9EA4',
    textAlign: 'center',
    lineHeight: 20,
  },
  trackerWrap: {
    marginVertical: 12,
    alignItems: 'center',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#27292F',
    marginVertical: 12,
  },

  /* ── Courier Profile Card ───────────────────────────────── */
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  courierAvatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CCFF00',
    borderWidth: 2,
    borderColor: '#18191A',
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  courierRole: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
  },
  courierActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  limeChatDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CCFF00',
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  /* ── Details Box ────────────────────────────────────────── */
  detailsBox: {
    backgroundColor: '#22242A',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    gap: 10,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2F323A',
  },
  detailsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4D5DB',
  },
  detailsHeaderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#CCFF00',
  },
  detailsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsItemName: {
    fontSize: 14,
    color: '#E0E1E6',
    flex: 1,
    marginRight: 8,
  },
  detailsItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#2F323A',
    marginVertical: 4,
  },
  addressLine: {
    gap: 2,
  },
  addressLineLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  addressLineValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E0E1E6',
  },
  cancelBox: {
    marginTop: 6,
  },
  cancelTrigger: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  cancelForm: {
    gap: 8,
    paddingTop: 8,
  },
  cancelPrompt: {
    fontSize: 12,
    color: '#A0A0A5',
  },
  cancelInput: {
    backgroundColor: '#18191A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.white,
    fontSize: 13,
  },
  cancelBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelBackBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#32353E',
  },
  cancelBackBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FF4D4D',
  },
  cancelConfirmText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});

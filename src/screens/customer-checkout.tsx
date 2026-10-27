import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addressesApi,
  Button,
  cartApi,
  Chip,
  EmptyState,
  engagementApi,
  ErrorState,
  formatCurrency,
  Icon,
  KeyValue,
  LoadingState,
  Notice,
  ordersApi,
  paymentMethodForChoice,
  TextAreaField,
  useAsync,
  useToast,
  colors,
  radius,
  shadows,
  spacing,
  typography,
  type PaymentUiChoice,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate, useSearchParams } from '../router';
import { useCustomerCart } from '../customer-cart.context';

const PAYMENT_CHOICES: {
  value: PaymentUiChoice;
  label: string;
  icon: 'smartphone' | 'creditCard' | 'bank' | 'banknote';
  note: string;
}[] = [
  { value: 'UPI', label: 'UPI', icon: 'smartphone', note: 'GPay, PhonePe, Paytm' },
  { value: 'CARD', label: 'Card', icon: 'creditCard', note: 'Visa, Mastercard, RuPay' },
  { value: 'NET_BANKING', label: 'Net banking', icon: 'bank', note: 'All major banks' },
  { value: 'CASH_ON_DELIVERY', label: 'Cash on delivery', icon: 'banknote', note: 'Pay at your door' },
];

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function dayLabel(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function defaultDeliveryDate(): string {
  return isoDate(1);
}

/** 11. Checkout — address, coupon, schedule and payment, submitted to `POST /orders/checkout`. */
export function CustomerCheckoutScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { cart, refresh } = useCustomerCart();

  const couponFromCart = params.get('coupon') ?? undefined;

  const [addressId, setAddressId] = useState<string | null>(null);
  const [choice, setChoice] = useState<PaymentUiChoice>('UPI');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [couponCode, setCouponCode] = useState(couponFromCart ?? '');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = useAsync((signal) => addressesApi.listAddresses(signal), []);

  useEffect(() => {
    if (!addressId && addresses.data?.length) {
      const preferred = addresses.data.find((address) => address.isDefault) ?? addresses.data[0];
      setAddressId(preferred.addressId);
    }
  }, [addresses.data, addressId]);

  // Authoritative totals for the selected address + coupon (backend recalculates).
  const preview = useAsync(
    (signal) =>
      cartApi.getCart(
        { addressId: addressId ?? undefined, couponCode: couponCode || undefined },
        signal,
      ),
    [addressId, couponCode],
    { enabled: Boolean(addressId) },
  );

  const summary = preview.data?.summary ?? cart?.summary ?? null;

  const canPlace = useMemo(
    () => Boolean(addressId) && !placing && (cart?.items.length ?? 0) > 0,
    [addressId, placing, cart?.items.length],
  );

  const placeOrder = async () => {
    if (!canPlace || !addressId) return;
    setPlacing(true);
    setError(null);
    try {
      const result = await ordersApi.checkout({
        addressId,
        paymentMethod: paymentMethodForChoice(choice),
        couponCode: couponCode || undefined,
        deliveryDate,
        notes: notes.trim() || undefined,
      });

      const orders = Array.isArray(result) ? result : [result];
      const first = orders[0];

      if (choice !== 'CASH_ON_DELIVERY' && first) {
        // Backend mock provider confirms the server-side payment intent.
        try {
          await engagementApi.createPaymentIntent({
            orderId: first.orderId,
            method: paymentMethodForChoice(choice),
          });
        } catch {
          setError('Order placed, but the payment step could not be completed.');
        }
      }

      await refresh();
      toast.success('Order placed successfully');
      navigate(
        `${customerPathConfirmation(first?.orderId ?? '')}?count=${orders.length}`,
        { replace: true },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place your order.';
      setError(message);
      toast.error(message);
    } finally {
      setPlacing(false);
    }
  };

  if (cart && cart.items.length === 0) {
    return (
      <CustomerShell nav={false} headerProps={{ title: 'Checkout', onBack: () => navigate(-1) }}>
        <EmptyState
          icon="cart"
          title="Nothing to check out"
          description="Your cart is empty."
          actionLabel="Browse products"
          onAction={() => navigate(customerRoutes.products)}
        />
      </CustomerShell>
    );
  }

  const dateOptions = [1, 2, 3, 4, 5].map((offset) => ({
    value: isoDate(offset),
    label: dayLabel(offset),
  }));

  return (
    <CustomerShell
      nav={false}
      headerProps={{ title: 'Checkout', onBack: () => navigate(-1) }}
      footer={
        <View style={styles.footer}>
          <Button
            size="lg"
            block
            loading={placing}
            disabled={!canPlace}
            onPress={() => void placeOrder()}
            trailingPrice={formatCurrency(summary?.total ?? 0, summary?.currency ?? 'INR')}
          >
            Place order
          </Button>
          <Text style={styles.terms}>By placing this order you agree to our delivery terms.</Text>
        </View>
      }
    >
      {addresses.status === 'loading' ? (
        <LoadingState label="Loading your addresses…" />
      ) : addresses.status === 'error' ? (
        <ErrorState
          title="Could not load addresses"
          description={addresses.error?.message}
          code={addresses.error?.code}
          onRetry={addresses.reload}
        />
      ) : (addresses.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="mapPin"
          title="Add a delivery address"
          description="We need an address before we can deliver your dairy order."
          actionLabel="Add address"
          onAction={() => navigate(customerRoutes.addresses)}
        />
      ) : (
        <>
          <View>
            <View style={styles.sectionHead}>
              <Text style={styles.h3}>Deliver to</Text>
              <Pressable accessibilityRole="button" onPress={() => navigate(customerRoutes.addresses)} hitSlop={8}>
                <Text style={styles.link}>Manage</Text>
              </Pressable>
            </View>
            <View style={styles.stack}>
              {addresses.data!.map((address) => {
                const active = address.addressId === addressId;
                return (
                  <Pressable
                    key={address.addressId}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setAddressId(address.addressId)}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                  >
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active ? <Icon name="check" size={13} strokeWidth={3} color={colors.white} /> : null}
                    </View>
                    <Icon name="mapPin" size={19} color={active ? colors.green : colors.muted} />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{address.title}</Text>
                      <Text style={styles.optionCaption}>
                        {address.addressLine1}, {address.city} {address.postalCode}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.h3, styles.sectionGap]}>Delivery date</Text>
            <View style={styles.chipRow}>
              {dateOptions.map((option) => (
                <Chip
                  key={option.value}
                  active={deliveryDate === option.value}
                  onPress={() => setDeliveryDate(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.h3}>Payment method</Text>
            </View>
            <View style={styles.payGrid}>
              {PAYMENT_CHOICES.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: choice === option.value }}
                  onPress={() => setChoice(option.value)}
                  style={[styles.payTile, choice === option.value && styles.payTileActive]}
                >
                  <View
                    style={[
                      styles.payIcon,
                      choice === option.value && { backgroundColor: colors.greenLight },
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={20}
                      color={choice === option.value ? colors.green : colors.muted}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.payLabel, choice === option.value && styles.payLabelActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.payNote}>
              {PAYMENT_CHOICES.find((option) => option.value === choice)?.note} · Payments are
              processed securely by DairyFresh.
            </Text>
          </View>

          <View style={styles.section}>
            <TextAreaField
              label="Delivery notes (optional)"
              placeholder="Leave it with the guard, ring twice…"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.h3}>Coupon</Text>
            </View>
            <View style={styles.couponField}>
              <Icon name="gift" size={18} color={colors.muted} />
              <TextInput
                autoCapitalize="characters"
                placeholder="Coupon code"
                placeholderTextColor={colors.muted2}
                accessibilityLabel="Coupon code"
                value={couponCode}
                onChangeText={(value) => setCouponCode(value.toUpperCase())}
                style={styles.couponInput}
              />
            </View>
          </View>

          <View style={[styles.section, styles.summary]}>
            <Text style={styles.micro}>Order summary</Text>
            <View style={styles.summaryRows}>
              <KeyValue
                label={`Items (${cart?.itemCount ?? 0})`}
                value={formatCurrency(summary?.subtotal ?? 0, summary?.currency ?? 'INR')}
              />
              <KeyValue
                label="Delivery fee"
                value={
                  (summary?.deliveryFee ?? 0) === 0
                    ? 'FREE'
                    : formatCurrency(summary?.deliveryFee ?? 0, summary?.currency ?? 'INR')
                }
              />
              <KeyValue
                label="Taxes"
                value={formatCurrency(summary?.tax ?? 0, summary?.currency ?? 'INR')}
              />
              {summary && summary.discount > 0 ? (
                <KeyValue
                  label={`Discount${summary.appliedCoupon ? ` (${summary.appliedCoupon.code})` : ''}`}
                  value={`− ${formatCurrency(summary.discount, summary.currency)}`}
                />
              ) : null}
              <KeyValue
                strong
                label="Total"
                value={formatCurrency(summary?.total ?? 0, summary?.currency ?? 'INR')}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorWrap}>
              <Notice tone="error" icon="alert">
                {error}
              </Notice>
            </View>
          ) : null}
        </>
      )}
    </CustomerShell>
  );
}

function customerPathConfirmation(orderId: string): string {
  return `/order-confirmation/${encodeURIComponent(orderId)}`;
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionGap: { marginBottom: spacing.sm },
  h3: { ...typography.h3 },
  link: { ...typography.small, color: colors.green, fontWeight: '700' },
  stack: { gap: spacing.sm, marginTop: spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionCardActive: { borderColor: colors.green, backgroundColor: colors.greenPale },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: colors.green, borderColor: colors.green },
  optionText: { flex: 1, minWidth: 0 },
  optionTitle: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  optionCaption: { ...typography.caption },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  payTile: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.xs,
  },
  payTileActive: { borderColor: colors.green, backgroundColor: colors.greenPale },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payLabel: { ...typography.small, fontWeight: '600', color: colors.ink2 },
  payLabelActive: { color: colors.greenDark },
  payNote: { ...typography.caption, marginTop: spacing.sm, lineHeight: 18 },
  couponField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  couponInput: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: 10 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  summaryRows: { marginTop: spacing.sm },
  micro: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.6 },
  errorWrap: { marginTop: spacing.lg },
  footer: { paddingHorizontal: 18, gap: spacing.sm },
  terms: { ...typography.caption, textAlign: 'center' },
});

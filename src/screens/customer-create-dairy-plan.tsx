import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addressesApi,
  catalogApi,
  DairyImage,
  EmptyState,
  ErrorState,
  formatCurrency,
  Icon,
  LoadingState,
  QuantityStepper,
  useAsync,
  colors,
  type PlanFrequency,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { getDraftPlan, setDraftPlan } from '../draft-plan-store';
import { useNavigate } from '../router';

const FREQUENCIES: { id: PlanFrequency; label: string; icon: string; hint: string }[] = [
  { id: 'DAILY', label: 'Daily', icon: 'milk', hint: 'Delivered fresh every morning without gaps.' },
  { id: 'SELECTED_DAYS', label: 'Custom Days', icon: 'calendar', hint: 'Delivered only on the weekdays you pick.' },
  { id: 'WEEKLY', label: 'Weekly', icon: 'sparkle', hint: 'Delivered once every week on your start day.' },
  { id: 'MONTHLY', label: 'Monthly', icon: 'jar', hint: 'Delivered once every month.' },
];

const WEEKDAYS = [
  { day: 1, label: 'Mon', full: 'Monday' },
  { day: 2, label: 'Tue', full: 'Tuesday' },
  { day: 3, label: 'Wed', full: 'Wednesday' },
  { day: 4, label: 'Thu', full: 'Thursday' },
  { day: 5, label: 'Fri', full: 'Friday' },
  { day: 6, label: 'Sat', full: 'Saturday' },
  { day: 0, label: 'Sun', full: 'Sunday' },
];

function startOptions(): { value: string; weekday: string; day: string; month: string }[] {
  const out: { value: string; weekday: string; day: string; month: string }[] = [];
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    out.push({
      value: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      day: String(date.getDate()),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
    });
  }
  return out;
}

/** 16. Create dairy plan — Builder step leading to separate Review/Preview screen. */
export function CustomerCreateDairyPlanScreen() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const existingDraft = getDraftPlan();

  const [frequency, setFrequency] = useState<PlanFrequency>(
    () => existingDraft?.frequency ?? 'DAILY',
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    () => existingDraft?.selectedDays ?? [1, 2, 3, 4, 5], // Mon-Fri default
  );
  const [startDate, setStartDate] = useState(
    () => existingDraft?.startDate ?? startOptions()[0].value,
  );
  const [addressId, setAddressId] = useState<string | null>(
    () => existingDraft?.addressId ?? null,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (existingDraft?.items?.length) {
      const q: Record<string, number> = {};
      existingDraft.items.forEach((it) => {
        q[it.product.productId] = it.quantity;
      });
      return q;
    }
    return {};
  });
  const [error, setError] = useState<string | null>(null);

  const addresses = useAsync((signal) => addressesApi.listAddresses(signal), []);
  const products = useAsync(
    (signal) => catalogApi.listProducts({ subscriptionAllowed: true, limit: 30 }, signal),
    [],
  );

  const dates = useMemo(() => startOptions(), []);

  useEffect(() => {
    if (!addressId && addresses.data?.length) {
      const preferred = addresses.data.find((address) => address.isDefault) ?? addresses.data[0];
      setAddressId(preferred.addressId);
    }
  }, [addresses.data, addressId]);

  const selectedAddress = useMemo(
    () => (addresses.data ?? []).find((a) => a.addressId === addressId) ?? addresses.data?.[0],
    [addresses.data, addressId],
  );

  const chosen = useMemo(
    () =>
      (products.data?.products ?? [])
        .filter((product) => (quantities[product.productId] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: quantities[product.productId],
        })),
    [products.data, quantities],
  );

  const dailyTotal = chosen.reduce(
    (sum, row) => sum + row.product.pricing.price * row.quantity,
    0,
  );

  const toggleDay = (day: number) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current; // Keep at least 1 day selected
        return current.filter((v) => v !== day);
      }
      return [...current, day].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
    });
  };

  const applyPresetDays = (preset: 'WEEKDAYS' | 'WEEKENDS' | 'ALL') => {
    if (preset === 'WEEKDAYS') setSelectedDays([1, 2, 3, 4, 5]);
    else if (preset === 'WEEKENDS') setSelectedDays([6, 0]);
    else setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
  };

  const canProceed =
    Boolean(addressId) && chosen.length > 0 && (frequency !== 'SELECTED_DAYS' || selectedDays.length > 0);

  const handleStartPlan = () => {
    if (!addressId) {
      setError('Please select a delivery address first.');
      return;
    }
    if (chosen.length === 0) {
      setError('Please add at least one product to your plan.');
      return;
    }
    if (frequency === 'SELECTED_DAYS' && selectedDays.length === 0) {
      setError('Please select at least one delivery day.');
      return;
    }

    setError(null);
    setDraftPlan({
      addressId,
      address: selectedAddress,
      frequency,
      selectedDays: frequency === 'SELECTED_DAYS' ? selectedDays : [],
      startDate,
      items: chosen,
    });

    navigate(customerRoutes.previewDairyPlan);
  };

  const handleBackToProfile = () => {
    navigate(customerRoutes.profile);
  };

  if (addresses.status === 'loading' || products.status === 'loading') {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'New dairy plan', onBack: handleBackToProfile }}
      >
        <LoadingState label="Preparing your plan builder…" />
      </CustomerShell>
    );
  }

  if (addresses.status === 'error') {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'New dairy plan', onBack: handleBackToProfile }}
      >
        <ErrorState
          title="Could not load addresses"
          description={addresses.error?.message}
          code={addresses.error?.code}
          onRetry={addresses.reload}
        />
      </CustomerShell>
    );
  }

  if (!addresses.data?.length) {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'New dairy plan', onBack: handleBackToProfile }}
      >
        <EmptyState
          icon="mapPin"
          title="Add a delivery address first"
          description="Dairy plans need a delivery address."
          actionLabel="Add address"
          onAction={() => navigate(customerRoutes.addresses)}
        />
      </CustomerShell>
    );
  }

  const currentFreq = FREQUENCIES.find((f) => f.id === frequency) ?? FREQUENCIES[0];

  return (
    <CustomerShell
      nav={false}
      background="#F8F9FB"
      headerProps={{
        title: 'New dairy plan',
        subtitle: 'Customize daily morning delivery',
        onBack: handleBackToProfile,
      }}
      floatingFooter={
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingFooterWrap,
            { bottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={chosen.length ? `Start plan ${formatCurrency(dailyTotal)}` : 'Select products'}
            disabled={!canProceed}
            onPress={handleStartPlan}
            style={({ pressed }) => [
              styles.floatingCta,
              !canProceed && styles.floatingCtaDisabled,
              pressed && canProceed && { opacity: 0.9 },
            ]}
          >
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTotal}>
                {chosen.length ? `${formatCurrency(dailyTotal)} / delivery` : 'Select products'}
              </Text>
              <Text style={styles.ctaSubtitle}>
                {chosen.length
                  ? `${chosen.reduce((sum, r) => sum + r.quantity, 0)} items · ${currentFreq.label}`
                  : 'Add products below to start plan'}
              </Text>
            </View>
            <View style={styles.ctaActionBtn}>
              <Text style={styles.ctaActionText}>Start Plan</Text>
              <Icon name="arrowRight" size={16} color="#121316" strokeWidth={2.4} />
            </View>
          </Pressable>
        </View>
      }
    >
      <View style={styles.pageContent}>
        {/* ── 1. Deliver to Section ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Deliver to</Text>
            <Pressable accessibilityRole="button" onPress={() => navigate(customerRoutes.addresses)}>
              <Text style={styles.linkText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressIconWrap}>
              <Icon name="mapPin" size={18} color="#141518" />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressTitle}>{selectedAddress?.title || 'Home'}</Text>
              <Text numberOfLines={1} style={styles.addressSubtitle}>
                {selectedAddress?.addressLine1
                  ? `${selectedAddress.addressLine1}, ${selectedAddress.city}`
                  : 'Bangalore'}
              </Text>
            </View>
            <View style={styles.addressCheckBadge}>
              <Icon name="check" size={14} color="#141518" />
            </View>
          </View>
        </View>

        {/* ── 2. Frequency Section ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Delivery frequency</Text>
          </View>
          <View style={styles.frequencyGrid}>
            {FREQUENCIES.map((f) => {
              const active = f.id === frequency;
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={f.label}
                  onPress={() => setFrequency(f.id)}
                  style={({ pressed }) => [
                    styles.freqCard,
                    active && styles.freqCardActive,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={[styles.freqLabel, active && styles.freqLabelActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hintText}>{currentFreq.hint}</Text>

          {/* Weekday Selection when Custom Days is picked */}
          {frequency === 'SELECTED_DAYS' && (
            <View style={styles.weekdayContainer}>
              <View style={styles.weekdayHeaderRow}>
                <View>
                  <Text style={styles.weekdayHeading}>Select delivery days</Text>
                  <Text style={styles.weekdaySubtitle}>
                    {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected each week
                  </Text>
                </View>

                {/* Preset shortcuts */}
                <View style={styles.presetsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => applyPresetDays('WEEKDAYS')}
                    style={styles.presetPill}
                  >
                    <Text style={styles.presetText}>Mon-Fri</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => applyPresetDays('ALL')}
                    style={styles.presetPill}
                  >
                    <Text style={styles.presetText}>All days</Text>
                  </Pressable>
                </View>
              </View>

              {/* Day selection buttons with generous spacing */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map(({ day, label }) => {
                  const active = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} ${active ? 'selected' : 'not selected'}`}
                      onPress={() => toggleDay(day)}
                      style={({ pressed }) => [
                        styles.dayBox,
                        active && styles.dayBoxActive,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── 3. Start Date Carousel ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>First delivery date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {dates.map((d) => {
              const active = d.value === startDate;
              return (
                <Pressable
                  key={d.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.weekday} ${d.day} ${d.month}`}
                  onPress={() => setStartDate(d.value)}
                  style={({ pressed }) => [
                    styles.dateCard,
                    active && styles.dateCardActive,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={[styles.dateWeekday, active && styles.dateWeekdayActive]}>
                    {d.weekday}
                  </Text>
                  <Text style={[styles.dateDay, active && styles.dateDayActive]}>
                    {d.day}
                  </Text>
                  <Text style={[styles.dateMonth, active && styles.dateMonthActive]}>
                    {d.month}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 4. Choose Products Section ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Choose products</Text>
            {chosen.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{chosen.length} selected</Text>
              </View>
            )}
          </View>

          {products.status === 'error' ? (
            <ErrorState
              title="Could not load products"
              description={products.error?.message}
              code={products.error?.code}
              onRetry={products.reload}
            />
          ) : (products.data?.products.length ?? 0) === 0 ? (
            <EmptyState
              icon="basket"
              title="No subscription products"
              description="This merchant hasn’t enabled any products for plans yet."
            />
          ) : (
            <View style={styles.productsStack}>
              {products.data!.products.map((product) => {
                const quantity = quantities[product.productId] ?? 0;
                return (
                  <View key={product.productId} style={styles.productCard}>
                    <View style={styles.productMedia}>
                      <DairyImage
                        src={product.image?.imageUrl}
                        name={product.name}
                        category={product.category?.name}
                        style={styles.productImg}
                      />
                    </View>
                    <View style={styles.productBody}>
                      <Text numberOfLines={2} style={styles.productName}>
                        {product.name}
                      </Text>
                      <Text style={styles.productUnit}>{product.pricing.unit || 'Pack'}</Text>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>
                          {formatCurrency(product.pricing.price, product.pricing.currency)}
                        </Text>
                        <Text style={styles.perDeliveryText}>/ delivery</Text>
                      </View>
                    </View>
                    <View style={styles.productAction}>
                      {quantity > 0 ? (
                        <QuantityStepper
                          value={quantity}
                          min={0}
                          onChange={(value) =>
                            setQuantities((current) => {
                              const next = { ...current };
                              if (value <= 0) {
                                delete next[product.productId];
                              } else {
                                next[product.productId] = value;
                              }
                              return next;
                            })
                          }
                        />
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${product.name} to plan`}
                          onPress={() =>
                            setQuantities((current) => ({
                              ...current,
                              [product.productId]: 1,
                            }))
                          }
                          style={({ pressed }) => [styles.addPillBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Icon name="plus" size={14} color="#141518" strokeWidth={2.6} />
                          <Text style={styles.addPillText}>Add</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Icon name="alert" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 22,
  },
  section: {
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#141518',
    letterSpacing: -0.3,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#141518',
  },

  /* Address Card */
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  addressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
  addressSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  addressCheckBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Frequency Grid */
  frequencyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  freqCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  freqCardActive: {
    backgroundColor: '#141518',
  },
  freqLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
  freqLabelActive: {
    color: colors.white,
    fontWeight: '800',
  },
  hintText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: -4,
    paddingHorizontal: 2,
  },

  /* Weekday container */
  weekdayContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 22,
    borderWidth: 0,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141518',
  },
  weekdaySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#141518',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxActive: {
    backgroundColor: '#141518',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  dayTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Date horizontal scroll */
  dateScroll: {
    gap: 10,
    paddingRight: 16,
  },
  dateCard: {
    width: 68,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateCardActive: {
    backgroundColor: '#141518',
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dateWeekdayActive: {
    color: '#CCFF00',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '900',
    color: '#141518',
  },
  dateDayActive: {
    color: colors.white,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dateMonthActive: {
    color: '#E5E7EB',
  },

  /* Product Cards */
  productsStack: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 22,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  productMedia: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: {
    width: 58,
    height: 58,
  },
  productBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
    lineHeight: 20,
  },
  productUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
  perDeliveryText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  productAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121316',
  },

  /* Floating CTA on First Layer */
  floatingFooterWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
  },
  floatingCta: {
    backgroundColor: '#141518',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  floatingCtaDisabled: {
    opacity: 0.45,
  },
  ctaTextWrap: {
    gap: 2,
  },
  ctaTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.white,
  },
  ctaSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ctaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },
  ctaActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121316',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
});

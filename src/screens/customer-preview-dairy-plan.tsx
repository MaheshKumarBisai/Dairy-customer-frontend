import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DairyImage,
  formatCurrency,
  Icon,
  plansApi,
  useToast,
  WEEKDAY_LABELS_MON_FIRST,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerPath, customerRoutes } from '../customer-routes';
import { clearDraftPlan, getDraftPlan } from '../draft-plan-store';
import { useNavigate } from '../router';
import { router } from 'expo-router';

function formatPlanDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function CustomerPreviewDairyPlanScreen() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const draft = getDraftPlan();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time slots: Morning (6-7 AM), Evening (7-8 PM), or Both
  const [selectedSlots, setSelectedSlots] = useState<('MORNING' | 'EVENING')[]>(['MORNING']);

  const toggleSlot = (slot: 'MORNING' | 'EVENING') => {
    setSelectedSlots((prev) => {
      if (prev.includes(slot)) {
        if (prev.length === 1) return prev; // Keep at least one slot selected
        return prev.filter((s) => s !== slot);
      }
      return [...prev, slot];
    });
  };

  const hasMorning = selectedSlots.includes('MORNING');
  const hasEvening = selectedSlots.includes('EVENING');
  const isBothSlots = hasMorning && hasEvening;
  const slotMultiplier = selectedSlots.length; // 1 or 2

  const handleBackToBuilder = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      navigate(customerRoutes.createDairyPlan, { replace: true });
    }
  };

  // If no draft exists, redirect back to create plan screen
  useEffect(() => {
    if (!draft || !draft.items.length) {
      navigate(customerRoutes.createDairyPlan, { replace: true });
    }
  }, [draft, navigate]);

  const items = draft?.items ?? [];
  const frequency = draft?.frequency ?? 'DAILY';
  const selectedDays = draft?.selectedDays ?? [];
  const startDate = draft?.startDate ?? '';
  const address = draft?.address;

  const perDeliveryCost = useMemo(
    () => items.reduce((sum, item) => sum + item.product.pricing.price * item.quantity, 0),
    [items],
  );

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  // Calculate estimated monthly deliveries
  const baseMonthlyDeliveries = useMemo(() => {
    if (frequency === 'DAILY') return 30;
    if (frequency === 'SELECTED_DAYS') return Math.max(1, Math.round(selectedDays.length * 4.33));
    if (frequency === 'WEEKLY') return 4;
    return 1;
  }, [frequency, selectedDays]);

  const totalMonthlyDeliveries = baseMonthlyDeliveries * slotMultiplier;
  const estimatedMonthlyCost = perDeliveryCost * totalMonthlyDeliveries;
  const costPerScheduledDay = perDeliveryCost * slotMultiplier;

  // Clean, uncluttered header badge
  const frequencyBadge = useMemo(() => {
    if (frequency === 'DAILY') return 'Daily Fresh';
    if (frequency === 'SELECTED_DAYS') return 'Custom Days';
    if (frequency === 'WEEKLY') return 'Weekly';
    return 'Monthly';
  }, [frequency]);

  const selectedDayLabels = useMemo(() => {
    const map: Record<number, string> = {
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
      0: 'Sun',
    };
    const active = selectedDays.map((d) => map[d]).filter(Boolean);
    if (selectedDays.length === 5 && !selectedDays.includes(6) && !selectedDays.includes(0)) {
      return 'Mon to Fri';
    }
    if (selectedDays.length === 2 && selectedDays.includes(6) && selectedDays.includes(0)) {
      return 'Weekends (Sat & Sun)';
    }
    if (selectedDays.length === 7) {
      return 'Everyday';
    }
    return active.join(', ');
  }, [selectedDays]);

  const placePlan = async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const plan = await plansApi.createPlan({
        addressId: draft.addressId,
        frequency: draft.frequency,
        selectedDays: draft.frequency === 'SELECTED_DAYS' ? draft.selectedDays : [],
        startDate: draft.startDate,
        items: draft.items.map((it) => ({
          productId: it.product.productId,
          quantity: it.quantity,
        })),
      });

      clearDraftPlan();
      toast.success('Dairy plan activated successfully!');
      navigate(customerPath('dairyPlanDetails', { planId: plan.planId }), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not place plan. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) return null;

  return (
    <CustomerShell
      nav={false}
      background="#F8F9FB"
      headerProps={{
        title: 'Review dairy plan',
        subtitle: 'Verify products & schedule before placing',
        onBack: handleBackToBuilder,
      }}
      floatingFooter={
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingFooterWrap,
            { bottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.floatingBar}>
            <View style={styles.barCostInfo}>
              <Text style={styles.barCostValue}>
                {formatCurrency(costPerScheduledDay)}
              </Text>
              <Text style={styles.barCostSub}>
                {isBothSlots ? '/ day (2 deliveries)' : '/ delivery'} ·{' '}
                {isBothSlots ? totalQuantity * 2 : totalQuantity} items
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Place Plan ${formatCurrency(costPerScheduledDay)}`}
              disabled={submitting}
              onPress={() => void placePlan()}
              style={({ pressed }) => [
                styles.placeBtn,
                pressed && { opacity: 0.9 },
                submitting && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.placeBtnText}>{submitting ? 'Placing Plan…' : 'Place Plan'}</Text>
              <Icon name="arrowRight" size={17} color="#141518" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={styles.content}>
        {/* ── 1. Plan Schedule Card (Clean & Clear) ────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Icon name="calendar" size={18} color="#141518" />
              </View>
              <Text style={styles.cardTitle}>Delivery Schedule</Text>
            </View>
            <View style={styles.freqBadge}>
              <Text style={styles.freqBadgeText}>{frequencyBadge}</Text>
            </View>
          </View>

          {/* Clean Custom Days Breakdown */}
          {frequency === 'SELECTED_DAYS' && (
            <View style={styles.customDaysContainer}>
              <View style={styles.customDaysHeader}>
                <View>
                  <Text style={styles.customDaysTitle}>
                    {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} every week
                  </Text>
                  <Text style={styles.customDaysSubtitle}>
                    Active on: {selectedDayLabels}
                  </Text>
                </View>
                <View style={styles.frequencyTag}>
                  <Text style={styles.frequencyTagText}>Custom</Text>
                </View>
              </View>

              {/* 7-Day Visual Row */}
              <View style={styles.daysRow}>
                {WEEKDAY_LABELS_MON_FIRST.map((label, idx) => {
                  const day = idx + 1;
                  const sunday = idx === 6 ? 0 : day;
                  const active = selectedDays.includes(sunday);
                  return (
                    <View
                      key={label}
                      style={[styles.dayPill, active && styles.dayPillActive]}
                    >
                      <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {frequency === 'DAILY' && (
            <View style={styles.simpleScheduleRow}>
              <Icon name="sparkle" size={16} color="#141518" />
              <Text style={styles.simpleScheduleText}>
                Every day delivery · 7 mornings a week without gaps
              </Text>
            </View>
          )}

          {frequency === 'WEEKLY' && (
            <View style={styles.simpleScheduleRow}>
              <Icon name="sparkle" size={16} color="#141518" />
              <Text style={styles.simpleScheduleText}>
                Weekly delivery · Once every week on scheduled start day
              </Text>
            </View>
          )}

          {frequency === 'MONTHLY' && (
            <View style={styles.simpleScheduleRow}>
              <Icon name="sparkle" size={16} color="#141518" />
              <Text style={styles.simpleScheduleText}>
                Monthly delivery · Once every month on start date
              </Text>
            </View>
          )}

          {/* First delivery date highlight */}
          <View style={styles.highlightRow}>
            <View style={styles.highlightCol}>
              <Text style={styles.highlightSub}>FIRST DELIVERY DATE</Text>
              <Text style={styles.highlightVal}>{formatPlanDate(startDate)}</Text>
            </View>
            <View style={styles.upcomingBadge}>
              <Icon name="calendar" size={13} color="#141518" />
              <Text style={styles.upcomingBadgeText}>Starts upcoming</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Delivery Time Slot Selection Card ──────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Icon name="clock" size={18} color="#141518" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Choose delivery time</Text>
                <Text style={styles.slotSubtitle}>Select Morning, Evening, or Both</Text>
              </View>
            </View>
          </View>

          {/* Slot Cards Grid */}
          <View style={styles.slotsGrid}>
            {/* Morning Slot (6:00 - 7:00 AM) */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasMorning }}
              accessibilityLabel="Morning delivery slot 6 to 7 AM"
              onPress={() => toggleSlot('MORNING')}
              style={({ pressed }) => [
                styles.slotCard,
                hasMorning && styles.slotCardActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.slotHead}>
                <View style={[styles.slotIconBox, hasMorning && styles.slotIconBoxActive]}>
                  <Icon name="sun" size={18} color={hasMorning ? '#141518' : '#6B7280'} />
                </View>
                <View style={[styles.slotCheckbox, hasMorning && styles.slotCheckboxActive]}>
                  {hasMorning && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </View>
              <Text style={[styles.slotName, hasMorning && styles.slotNameActive]}>Morning</Text>
              <Text style={[styles.slotHours, hasMorning && styles.slotHoursActive]}>
                6:00 AM – 7:00 AM
              </Text>
              <Text style={[styles.slotDesc, hasMorning && styles.slotDescActive]}>
                Fresh morning drop
              </Text>
            </Pressable>

            {/* Evening Slot (7:00 - 8:00 PM) */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasEvening }}
              accessibilityLabel="Evening delivery slot 7 to 8 PM"
              onPress={() => toggleSlot('EVENING')}
              style={({ pressed }) => [
                styles.slotCard,
                hasEvening && styles.slotCardActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.slotHead}>
                <View style={[styles.slotIconBox, hasEvening && styles.slotIconBoxActive]}>
                  <Icon name="moon" size={18} color={hasEvening ? '#141518' : '#6B7280'} />
                </View>
                <View style={[styles.slotCheckbox, hasEvening && styles.slotCheckboxActive]}>
                  {hasEvening && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </View>
              <Text style={[styles.slotName, hasEvening && styles.slotNameActive]}>Evening</Text>
              <Text style={[styles.slotHours, hasEvening && styles.slotHoursActive]}>
                7:00 PM – 8:00 PM
              </Text>
              <Text style={[styles.slotDesc, hasEvening && styles.slotDescActive]}>
                Fresh evening drop
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── 3. Deliver To Address Card ──────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Icon name="mapPin" size={18} color="#141518" />
              </View>
              <Text style={styles.cardTitle}>Deliver to</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleBackToBuilder}
            >
              <Text style={styles.changeBtnText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.addressBody}>
            <Text style={styles.addressTitle}>{address?.title || 'Home'}</Text>
            <Text style={styles.addressLine}>
              {address?.addressLine1
                ? `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city} - ${address.postalCode}`
                : 'Selected delivery location'}
            </Text>
            <View style={styles.earlyDeliveryBadge}>
              <Icon name="sparkle" size={13} color="#141518" />
              <Text style={styles.earlyDeliveryText}>
                {isBothSlots
                  ? 'Doorstep delivery at 6–7 AM & 7–8 PM'
                  : hasEvening
                    ? 'Doorstep delivery between 7:00 – 8:00 PM'
                    : 'Doorstep delivery between 6:00 – 7:00 AM'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 4. Products in Plan Card ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardIconWrap}>
                <Icon name="milk" size={18} color="#141518" />
              </View>
              <Text style={styles.cardTitle}>Selected Products ({items.length})</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleBackToBuilder}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </Pressable>
          </View>

          <View style={styles.itemsList}>
            {items.map(({ product, quantity }) => (
              <View key={product.productId} style={styles.itemRow}>
                <View style={styles.itemMedia}>
                  <DairyImage
                    src={product.image?.imageUrl}
                    name={product.name}
                    category={product.category?.name}
                    style={styles.itemImg}
                  />
                </View>
                <View style={styles.itemDetails}>
                  <Text numberOfLines={2} style={styles.itemName}>
                    {product.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {product.pricing.unit || 'Pack'} · Qty: {quantity}
                  </Text>
                </View>
                <View style={styles.itemCostWrap}>
                  <Text style={styles.itemCost}>
                    {formatCurrency(product.pricing.price * quantity, product.pricing.currency)}
                  </Text>
                  <Text style={styles.itemPerUnit}>
                    {formatCurrency(product.pricing.price)} each
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── 5. Billing & Summary Card ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.billTitle}>Plan summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Cost per delivery ({totalQuantity} items)</Text>
            <Text style={styles.billVal}>{formatCurrency(perDeliveryCost)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery slots</Text>
            <Text style={styles.billVal}>
              {isBothSlots ? 'Morning (6-7 AM) + Evening (7-8 PM)' : hasEvening ? 'Evening (7-8 PM)' : 'Morning (6-7 AM)'}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Est. deliveries / month ({totalMonthlyDeliveries} deliveries)
            </Text>
            <Text style={styles.billVal}>{formatCurrency(estimatedMonthlyCost)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery fee</Text>
            <Text style={styles.freeBadge}>FREE</Text>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalTitle}>
                {isBothSlots ? 'Total per day (2 deliveries)' : 'Total per delivery'}
              </Text>
              <Text style={styles.totalSub}>Billed only when delivered</Text>
            </View>
            <Text style={styles.totalVal}>{formatCurrency(costPerScheduledDay)}</Text>
          </View>
        </View>

        {/* ── 6. Assurance Badges ─────────────────────────────────── */}
        <View style={styles.assuranceBox}>
          <View style={styles.assuranceItem}>
            <Icon name="shield" size={16} color="#141518" />
            <Text style={styles.assuranceText}>Pause or cancel anytime with 1 tap</Text>
          </View>
          <View style={styles.assuranceItem}>
            <Icon name="truck" size={16} color="#141518" />
            <Text style={styles.assuranceText}>Fresh farm-direct dairy at your chosen delivery hours</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Icon name="alert" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#141518',
    letterSpacing: -0.2,
  },
  freqBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  freqBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#141518',
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },

  /* Custom Days Schedule Presentation */
  customDaysContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  customDaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customDaysTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141518',
  },
  customDaysSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  frequencyTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  frequencyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#141518',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayPill: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: '#141518',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  simpleScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
  },
  simpleScheduleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#141518',
    flex: 1,
  },

  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
  },
  highlightCol: {
    gap: 2,
  },
  highlightSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9CA3AF',
  },
  highlightVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141518',
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#141518',
  },

  /* Time Slot Selection */
  slotSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  slotCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  slotCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#141518',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slotIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIconBoxActive: {
    backgroundColor: '#F3F4F6',
  },
  slotCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCheckboxActive: {
    backgroundColor: '#141518',
    borderColor: '#141518',
  },
  slotName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  slotNameActive: {
    color: '#141518',
  },
  slotHours: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },
  slotHoursActive: {
    color: '#141518',
    fontWeight: '800',
  },
  slotDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  slotDescActive: {
    color: '#6B7280',
  },

  /* Address Card */
  addressBody: {
    gap: 6,
    paddingTop: 2,
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
  addressLine: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  earlyDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  earlyDeliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#141518',
  },

  /* Products */
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  itemMedia: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImg: {
    width: 44,
    height: 44,
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#141518',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemCostWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
  itemPerUnit: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  /* Plan Summary */
  billTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#141518',
    letterSpacing: -0.2,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  billVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
    textAlign: 'right',
  },
  freeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#141518',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
  totalSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#141518',
  },

  assuranceBox: {
    gap: 8,
    paddingHorizontal: 4,
  },
  assuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assuranceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },

  /* Floating CTA */
  floatingFooterWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141518',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  barCostInfo: {
    gap: 1,
  },
  barCostValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  barCostSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
  },
  placeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141518',
  },
});

export default CustomerPreviewDairyPlanScreen;

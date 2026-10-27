import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  BottomSheet,
  DairyImage,
  ErrorState,
  formatCurrency,
  formatDayMonth,
  FREQUENCY_LABEL,
  Icon,
  KeyValue,
  LoadingState,
  Notice,
  plansApi,
  QuantityStepper,
  useAsync,
  useToast,
  WEEKDAY_LABELS,
  colors,
  radius,
  spacing,
  typography,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { useNavigate, useParams } from '../router';

type SheetKind = 'extra' | 'skip' | null;

/** 17. Plan details — skip / extra delivery / pause / resume / cancel / schedule edits. */
export function CustomerDairyPlanDetailsScreen() {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [extraQty, setExtraQty] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useAsync((signal) => plansApi.getPlan(planId, signal), [planId], {
    enabled: Boolean(planId),
  });

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      toast.success(success);
      setSheet(null);
      plan.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'That action failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  if (plan.status === 'loading' && !plan.data) {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'Dairy plan', onBack: () => navigate(-1) }}
      >
        <LoadingState label="Loading plan…" />
      </CustomerShell>
    );
  }

  if (plan.status === 'error' || !plan.data) {
    return (
      <CustomerShell
        nav={false}
        headerProps={{ title: 'Dairy plan', onBack: () => navigate(-1) }}
      >
        <ErrorState
          title="Could not load this plan"
          description={plan.error?.message}
          code={plan.error?.code}
          onRetry={plan.reload}
        />
      </CustomerShell>
    );
  }

  const data = plan.data;
  const perDelivery = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isActive = data.status === 'ACTIVE';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const planAction = (
    icon: 'skip' | 'plus' | 'pause' | 'play' | 'trash',
    label: string,
    onPress: () => void,
    options: { disabled?: boolean; danger?: boolean } = {},
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(options.disabled) }}
      disabled={options.disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        options.danger && styles.actionDanger,
        options.disabled && styles.actionDisabled,
        pressed && !options.disabled && { opacity: 0.75 },
      ]}
    >
      <Icon
        name={icon}
        size={15}
        color={options.danger ? colors.red : options.disabled ? colors.muted2 : colors.ink}
      />
      <Text
        style={[
          styles.actionText,
          options.danger && { color: colors.red },
          options.disabled && { color: colors.muted2 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <CustomerShell
      nav={false}
      headerProps={{
        title: 'Dairy plan',
        subtitle: FREQUENCY_LABEL[data.frequency] ?? data.frequency,
        onBack: () => navigate(-1),
        right: (
          <Badge
            tone={data.status === 'ACTIVE' ? 'green' : data.status === 'PAUSED' ? 'amber' : 'red'}
          >
            {data.status}
          </Badge>
        ),
      }}
    >
      <View style={styles.nextCard}>
        <View style={styles.nextCardHead}>
          <View style={styles.limeCircle}>
            <Icon name="calendar" size={22} color="#121316" strokeWidth={2.4} />
          </View>
          <View style={styles.nextCardHeadText}>
            <Text style={styles.micro}>Next delivery</Text>
            <Text style={styles.nextDate}>{formatDayMonth(tomorrowIso)}</Text>
            <Text style={styles.caption}>
              {FREQUENCY_LABEL[data.frequency] ?? data.frequency}
              {data.frequency === 'SELECTED_DAYS' && data.selectedDays.length
                ? ` · ${[...data.selectedDays]
                    .sort((a, b) => a - b)
                    .map((day) => WEEKDAY_LABELS[day])
                    .join(', ')}`
                : ''}
            </Text>
          </View>
        </View>
        <View style={styles.kvBlock}>
          <KeyValue label="Per delivery" value={formatCurrency(perDelivery)} />
          <KeyValue label="Started" value={formatDayMonth(data.startDate)} />
          {data.address ? (
            <KeyValue label="Delivering to" value={`${data.address.title}, ${data.address.city}`} />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.h3}>Products</Text>
        </View>
        <View style={styles.stack}>
          {data.items.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <View style={styles.productMedia}>
                <DairyImage
                  src={item.product?.imageUrl ?? null}
                  name={item.product?.name ?? 'Product'}
                  category={item.product?.name}
                  style={styles.productImage}
                />
              </View>
              <View style={styles.productMain}>
                <Text numberOfLines={1} style={styles.productName}>
                  {item.product?.name ?? 'Product'}
                </Text>
                <Text style={styles.productMeta}>
                  {formatCurrency(item.unitPrice)} · qty {item.quantity}
                </Text>
                <Text style={styles.productPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.errorNotice}>
          <Notice tone="error" icon="alert">
            {error}
          </Notice>
        </View>
      ) : null}

      {data.status !== 'CANCELLED' ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.h3}>Manage plan</Text>
          </View>
          <View style={styles.actionRow}>
            {planAction('skip', 'Skip delivery', () => setSheet('skip'), {
              disabled: !isActive || busy !== null,
            })}
            {planAction('plus', 'Extra delivery', () => setSheet('extra'), {
              disabled: !isActive || busy !== null,
            })}
          </View>
          <View style={[styles.actionRow, styles.actionRowSecond]}>
            {planAction(
              data.status === 'ACTIVE' ? 'pause' : 'play',
              data.status === 'ACTIVE' ? 'Pause' : 'Resume',
              () =>
                void run(
                  data.status === 'ACTIVE' ? 'pause' : 'resume',
                  () =>
                    data.status === 'ACTIVE'
                      ? plansApi.pausePlan(data.planId)
                      : plansApi.resumePlan(data.planId),
                  data.status === 'ACTIVE' ? 'Plan paused' : 'Plan resumed',
                ),
              { disabled: busy !== null },
            )}
            {planAction('trash', 'Cancel plan', () =>
              void run('cancel', () => plansApi.cancelPlan(data.planId), 'Plan cancelled'),
            { disabled: busy !== null, danger: true })}
          </View>
        </View>
      ) : null}

      <BottomSheet open={sheet === 'skip'} title="Skip a delivery" onClose={() => setSheet(null)}>
        <Text style={styles.sheetBody}>
          We’ll skip tomorrow’s delivery ({formatDayMonth(tomorrowIso)}) and resume the day after.
        </Text>
        <View style={styles.sheetActions}>
          <Button
            block
            size="lg"
            loading={busy === 'skip'}
            onPress={() =>
              void run(
                'skip',
                () => plansApi.skipDelivery(data.planId, { targetDate: tomorrowIso }),
                'Delivery skipped',
              )
            }
          >
            Skip tomorrow
          </Button>
          <Button variant="ghost" block onPress={() => setSheet(null)} disabled={busy === 'skip'}>
            Keep delivery
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'extra'}
        title="Add an extra delivery"
        onClose={() => setSheet(null)}
      >
        <Text style={styles.sheetBody}>
          Adds {formatDayMonth(tomorrowIso)} as a bonus delivery with extra quantity.
        </Text>
        <View style={styles.extraRow}>
          <Text style={styles.h3}>Extra quantity</Text>
          <QuantityStepper value={extraQty} onChange={setExtraQty} min={1} />
        </View>
        <View style={styles.sheetActions}>
          <Button
            block
            size="lg"
            loading={busy === 'extra'}
            onPress={() =>
              void run(
                'extra',
                () =>
                  plansApi.addExtraDelivery(data.planId, {
                    targetDate: tomorrowIso,
                    extraQuantity: extraQty,
                  }),
                'Extra delivery added',
              )
            }
          >
            Add extra delivery
          </Button>
          <Button variant="ghost" block onPress={() => setSheet(null)} disabled={busy === 'extra'}>
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  nextCard: {
    backgroundColor: '#F8FBF9',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2EBE5',
    padding: spacing.lg,
  },
  nextCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  limeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE600',
  },
  nextCardHeadText: {
    flex: 1,
  },
  micro: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.6 },
  nextDate: { ...typography.h2, marginTop: 2 },
  caption: { ...typography.caption, lineHeight: 17, marginTop: 2 },
  kvBlock: { marginTop: spacing.md, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: '#E9EFEA' },
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  h3: { ...typography.h3 },
  stack: { gap: spacing.sm },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  productMedia: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden' },
  productImage: { flex: 1, borderRadius: 0 },
  productMain: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  productName: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  productMeta: { ...typography.caption, lineHeight: 17 },
  productPrice: { fontSize: 15, fontWeight: '800', color: colors.green, marginTop: 2 },
  errorNotice: { marginTop: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionRowSecond: { marginTop: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  actionDanger: { borderColor: colors.redBg, backgroundColor: colors.redBg },
  actionDisabled: { opacity: 0.55 },
  actionText: { ...typography.small, fontWeight: '700', color: colors.ink },
  sheetBody: { ...typography.body, lineHeight: 21 },
  sheetActions: { gap: spacing.sm, marginTop: spacing.md },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
  },
});

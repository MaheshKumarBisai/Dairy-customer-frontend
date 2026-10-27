import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Button,
  DairyImage,
  EmptyState,
  ErrorState,
  formatCurrency,
  FREQUENCY_LABEL,
  Icon,
  LoadingState,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
  plansApi,
  useAsync,
  colors,
  radius,
  spacing,
  typography,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerPath, customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';

/** 15. Dairy plans — subscription list from `GET /dairy-plans`. */
export function CustomerDairyPlansScreen() {
  const navigate = useNavigate();
  const plans = useAsync((signal) => plansApi.listPlans(signal), []);

  const active = (plans.data ?? []).filter((plan) => plan.status === 'ACTIVE');
  const past = (plans.data ?? []).filter((plan) => plan.status !== 'ACTIVE');

  const renderPlan = (planId: string) => {
    const plan = (plans.data ?? []).find((item) => item.planId === planId)!;
    const firstItem = plan.items[0];
    const dailyTotal = plan.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return (
      <Pressable
        key={plan.planId}
        accessibilityRole="button"
        accessibilityLabel={`Plan ${plan.planId}`}
        onPress={() => navigate(customerPath('dairyPlanDetails', { planId: plan.planId }))}
        style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.planTop}>
          <View style={styles.planMedia}>
            <DairyImage
              src={firstItem?.product?.imageUrl ?? null}
              name={firstItem?.product?.name ?? 'Dairy plan'}
              category={firstItem?.product?.name}
              style={styles.planImage}
            />
          </View>
          <View style={styles.planMain}>
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.planName}>
                {plan.items.map((item) => item.product.name).join(', ') || 'Dairy plan'}
              </Text>
              <Badge tone={PLAN_STATUS_TONE[plan.status]}>{PLAN_STATUS_LABEL[plan.status]}</Badge>
            </View>
            <Text style={styles.caption}>
              {FREQUENCY_LABEL[plan.frequency] ?? plan.frequency}
              {plan.frequency === 'SELECTED_DAYS' && plan.selectedDays.length
                ? ` · ${plan.selectedDays
                    .map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
                    .join(', ')}`
                : ''}
            </Text>
            <View style={[styles.row, styles.priceRow]}>
              <Text style={styles.price}>{formatCurrency(dailyTotal)}</Text>
              <Text style={styles.caption}>
                {plan.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) per delivery
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge tone="slate" icon="mapPin">
            {plan.address ? plan.address.title : 'Saved address'}
          </Badge>
          <Badge tone="blue" icon="store">
            {plan.merchant?.businessName ?? 'Dairy farm'}
          </Badge>
        </View>
      </Pressable>
    );
  };

  return (
    <CustomerShell
      headerProps={{
        title: 'Dairy plans',
        subtitle: active.length ? `${active.length} active` : undefined,
        onBack: () => navigate(-1),
      }}
    >
      {plans.status === 'loading' ? (
        <LoadingState label="Loading your plans…" />
      ) : plans.status === 'error' ? (
        <ErrorState
          title="Could not load your plans"
          description={plans.error?.message}
          code={plans.error?.code}
          onRetry={plans.reload}
        />
      ) : (plans.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="repeat"
          title="No dairy plans yet"
          description="Set up a daily or custom-day delivery of milk, curd and more — skip or pause anytime."
          actionLabel="Create a plan"
          onAction={() => navigate(customerRoutes.createDairyPlan)}
        />
      ) : (
        <>
          <View style={styles.listHead}>
            <Text style={styles.micro}>Active plans</Text>
          </View>
          <View style={styles.stack}>
            {active.length ? (
              active.map((plan) => renderPlan(plan.planId))
            ) : (
              <EmptyState
                icon="repeat"
                title="No active plans"
                description="Paused or cancelled plans are listed below."
                actionLabel="Create a plan"
                onAction={() => navigate(customerRoutes.createDairyPlan)}
              />
            )}
          </View>

          {past.length ? (
            <View style={styles.pastHead}>
              <Text style={styles.h3}>Past plans</Text>
            </View>
          ) : null}
          {past.length ? <View style={styles.stack}>{past.map((plan) => renderPlan(plan.planId))}</View> : null}

          {/* ── Start a new dairy plan Button at bottom of list ── */}
          <View style={styles.bottomCtaWrap}>
            <Button
              size="lg"
              block
              leadingIcon={<Icon name="plus" size={18} color={colors.white} />}
              onPress={() => navigate(customerRoutes.createDairyPlan)}
            >
              Start a new dairy plan
            </Button>
          </View>
        </>
      )}
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  micro: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.6 },
  caption: { ...typography.caption, lineHeight: 17 },
  stack: { gap: spacing.md },
  planCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  planTop: { flexDirection: 'row', gap: spacing.md },
  planMedia: { width: 74, height: 74, borderRadius: radius.sm, overflow: 'hidden' },
  planImage: { flex: 1, borderRadius: 0 },
  planMain: { flex: 1, minWidth: 0, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  priceRow: { marginTop: spacing.xs },
  planName: { fontWeight: '700', color: colors.ink, fontSize: 15, flexShrink: 1 },
  price: { fontSize: 16, fontWeight: '800', color: colors.green },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pastHead: { marginTop: spacing.xl, marginBottom: spacing.sm },
  h3: { ...typography.h3 },
  bottomCtaWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

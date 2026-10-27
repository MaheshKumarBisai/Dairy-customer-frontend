import { StyleSheet, Text, View } from 'react-native';
import { Badge, Icon, Notice, colors, radius, shadows, spacing, typography } from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { useNavigate } from '../router';

const METHODS = [
  {
    key: 'ONLINE',
    label: 'Online payment',
    icon: 'creditCard' as const,
    detail: 'UPI, cards and net banking are processed as a single backend method: ONLINE.',
  },
  {
    key: 'CASH_ON_DELIVERY',
    label: 'Cash on delivery',
    icon: 'banknote' as const,
    detail: 'Pay your delivery partner in cash when the order arrives.',
  },
  {
    key: 'WALLET',
    label: 'DairyFresh wallet',
    icon: 'wallet' as const,
    detail: 'The backend accepts WALLET, but balance/recharge endpoints are not available yet.',
  },
];

/** 20. Payment methods — real backend methods; saving cards/UPI needs an API that doesn't exist. */
export function CustomerPaymentMethodsScreen() {
  const navigate = useNavigate();

  return (
    <CustomerShell
      nav={false}
      headerProps={{
        title: 'Payment methods',
        onBack: () => navigate(-1),
      }}
    >
      <View style={styles.stack}>
        {METHODS.map((method) => (
          <View key={method.key} style={styles.optionCard}>
            <View style={styles.optionIcon}>
              <Icon name={method.icon} size={20} color={colors.green} />
            </View>
            <View style={styles.optionMain}>
              <Text style={styles.optionLabel}>{method.label}</Text>
              <Text style={styles.caption}>{method.detail}</Text>
            </View>
            <Badge tone="slate">{method.key.replace('_', ' ')}</Badge>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Notice tone="amber" icon="info">
          Saved cards, saved UPI IDs and stored payment tokens need a backend wallet/payments API.
          DairyFresh never stores card details in the app — checkout always asks your bank or UPI
          app through the server-created payment intent.
        </Notice>
      </View>

      <View style={styles.section}>
        <View style={styles.surface}>
          <Text style={styles.micro}>How payment works here</Text>
          <Text style={styles.caption}>
            1. You pick a method at checkout. 2. The backend creates the order and a payment
            intent. 3. Confirmation comes from the server response — the app never decides prices
            or payment success on its own.
          </Text>
        </View>
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionMain: { flex: 1, minWidth: 0, gap: 3 },
  optionLabel: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  caption: { ...typography.caption, lineHeight: 17 },
  section: { marginTop: spacing.xl },
  surface: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.greenPale, borderRadius: radius.lg },
  micro: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.6 },
});

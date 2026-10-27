import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL, Icon, KeyValue, Notice, Toggle, useToast, colors, radius, shadows, spacing, typography, storageRead, storageWrite } from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerAuth } from '../auth/customer-auth.context';

const NOTIFY_KEY = 'dairy.customer.notify';
const ORDER_UPDATES_KEY = 'dairy.customer.orderUpdates';

/** 22. Settings — device preferences (stored on this device) + app info. */
export function CustomerSettingsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout, profile } = useCustomerAuth();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);

  useEffect(() => {
    setPushEnabled(storageRead(NOTIFY_KEY) !== 'off');
    setOrderUpdates(storageRead(ORDER_UPDATES_KEY) !== 'off');
  }, []);

  const updatePush = (value: boolean) => {
    setPushEnabled(value);
    storageWrite(NOTIFY_KEY, value ? 'on' : 'off');
    toast.show(value ? 'Push notifications enabled on this device' : 'Push notifications turned off');
  };

  const updateOrderUpdates = (value: boolean) => {
    setOrderUpdates(value);
    storageWrite(ORDER_UPDATES_KEY, value ? 'on' : 'off');
  };

  const menuRow = (icon: 'bell' | 'truck' | 'list', label: string, end: React.ReactNode, onPress?: () => void) => {
    const content = (
      <View style={styles.menuRow}>
        <View style={styles.menuIcon}>
          <Icon name={icon} size={18} color={colors.green} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <View style={styles.menuEnd}>{end}</View>
      </View>
    );
    if (!onPress) return content;
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {content}
      </Pressable>
    );
  };

  return (
    <CustomerShell
      nav={false}
      headerProps={{ title: 'Settings', onBack: () => navigate(-1) }}
    >
      <View style={styles.card}>
        {menuRow('bell', 'Push notifications', <Toggle checked={pushEnabled} onChange={updatePush} label="Push notifications" />)}
        {menuRow('truck', 'Order & delivery updates', <Toggle checked={orderUpdates} onChange={updateOrderUpdates} label="Order updates" />)}
        {menuRow('list', 'Notification history', <Icon name="chevronRight" size={17} color={colors.muted2} />, () =>
          navigate(customerRoutes.notifications),
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.card, styles.appCard]}>
          <Text style={styles.micro}>App</Text>
          <KeyValue label="Version" value="1.0.0" />
          <KeyValue label="Backend API" value={API_BASE_URL} />
          <KeyValue label="Account role" value={profile?.role ?? 'CUSTOMER'} />
          <Text style={styles.caption}>
            Preferences on this screen are stored on your device only. Prices, stock, discounts and
            account roles always come from the DairyFresh backend.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Notice tone="muted" icon="info">
          Google/Apple sign-in, saved payment methods and delivery ETAs are disabled because the
          matching backend APIs don’t exist yet.
        </Notice>
      </View>

      <View style={styles.ctaBar}>
        <Pressable
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        >
          <Icon name="logout" size={18} color={colors.white} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.body, flex: 1, fontWeight: '600' },
  menuEnd: { alignItems: 'flex-end' },
  section: { marginTop: spacing.xl },
  appCard: { padding: spacing.md, gap: spacing.sm },
  micro: { ...typography.micro, textTransform: 'uppercase', letterSpacing: 0.6 },
  caption: { ...typography.caption, lineHeight: 17 },
  ctaBar: { marginTop: spacing.xl, paddingBottom: spacing.sm },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: 14,
    ...shadows.sm,
  },
  logoutText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});

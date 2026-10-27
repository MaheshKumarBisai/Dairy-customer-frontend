import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  EmptyState,
  engagementApi,
  ErrorState,
  formatRelative,
  Icon,
  LoadingState,
  useAsync,
  useToast,
  colors,
  radius,
  spacing,
  typography,
  type Notification,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { useNavigate } from '../router';

/** 19. Notifications — `GET /notifications` + `PATCH /notifications/:id/read`. */
export function CustomerNotificationsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const notifications = useAsync((signal) => engagementApi.listNotifications(signal), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  const markRead = async (item: Notification) => {
    if (item.isRead) return;
    setBusyId(item.id);
    try {
      await engagementApi.markNotificationRead(item.id);
      notifications.setData((current) =>
        (current ?? []).map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark as read.');
    } finally {
      setBusyId(null);
    }
  };

  const items = notifications.data ?? [];
  const unread = items.filter((item) => !item.isRead).length;

  const notifIcon = (title: string) =>
    /deliver|order|ship/i.test(title)
      ? 'package'
      : /plan|subscription/i.test(title)
        ? 'repeat'
        : /offer|coupon|discount/i.test(title)
          ? 'gift'
          : 'bell';

  return (
    <CustomerShell
      nav={false}
      headerProps={{
        title: 'Notifications',
        subtitle: unread ? `${unread} unread` : undefined,
        onBack: () => navigate(-1),
      }}
    >
      {notifications.status === 'loading' ? (
        <LoadingState label="Loading notifications…" />
      ) : notifications.status === 'error' ? (
        <ErrorState
          title="Could not load notifications"
          description={notifications.error?.message}
          code={notifications.error?.code}
          onRetry={notifications.reload}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="You’re all caught up"
          description="Order updates, delivery alerts and offers from your dairy farm will show up here."
        />
      ) : (
        <View style={styles.stack}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              disabled={busyId === item.id}
              onPress={() => void markRead(item)}
              style={[styles.card, !item.isRead && styles.cardUnread]}
            >
              <View style={[styles.icon, !item.isRead && styles.iconUnread]}>
                <Icon
                  name={notifIcon(item.title)}
                  size={20}
                  color={item.isRead ? colors.muted : colors.green}
                />
              </View>
              <View style={styles.main}>
                <View style={styles.titleRow}>
                  <Text numberOfLines={1} style={styles.title}>
                    {item.title}
                  </Text>
                  {!item.isRead ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
              {!item.isRead ? (
                <Badge tone="green" icon="check">
                  New
                </Badge>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardUnread: { borderColor: colors.greenLight, backgroundColor: colors.greenPale },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: { backgroundColor: colors.greenLight },
  main: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyStrong, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  body: { ...typography.small, color: colors.ink2, lineHeight: 19 },
  time: { ...typography.micro, marginTop: 2 },
});

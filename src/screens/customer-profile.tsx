import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  BottomSheet,
  Button,
  Icon,
  Notice,
  PasswordField,
  TextField,
  useToast,
  usersApi,
  radius,
  spacing,
  type IconName,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerAuth } from '../auth/customer-auth.context';

interface MenuItem {
  key: string;
  label: string;
  icon: IconName;
  to?: string;
  onClick?: () => void;
}

/** 21. Profile (Account) — Clean, minimalist luxury design with black icons and no outlines/shadows. */
export function CustomerProfileScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, logout, reloadProfile } = useCustomerAuth();

  const [sheet, setSheet] = useState<'profile' | 'password' | null>(null);
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await usersApi.updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      await reloadProfile();
      toast.success('Profile updated');
      setSheet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (busy) return;
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setSheet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      key: 'profile',
      label: 'Personal Details',
      icon: 'user',
      onClick: () => setSheet('profile'),
    },
    {
      key: 'payments',
      label: 'Payment Methods',
      icon: 'creditCard',
      to: customerRoutes.paymentMethods,
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      to: customerRoutes.notifications,
    },
    {
      key: 'password',
      label: 'Security & Password',
      icon: 'lock',
      onClick: () => setSheet('password'),
    },
    {
      key: 'help',
      label: 'Help & Support',
      icon: 'help',
      to: customerRoutes.settings,
    },
  ];

  return (
    <CustomerShell headerProps={{ title: 'Account' }}>
      {/* ── Top Profile Hero Card (No outline, No shadow) ─────────── */}
      <View style={styles.heroCard}>
        <View style={styles.avatarWrapper}>
          <Avatar name={profile?.name ?? 'User'} size={68} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => setSheet('profile')}
            style={styles.editBadge}
            hitSlop={8}
          >
            <Icon name="edit" size={12} color="#CCFF00" />
          </Pressable>
        </View>

        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{profile?.name ?? 'Guest User'}</Text>
          <Text style={styles.heroEmail}>{profile?.email ?? 'customer@example.com'}</Text>
          {profile?.phone ? <Text style={styles.heroPhone}>{profile.phone}</Text> : null}

          <View style={styles.memberBadge}>
            <Icon name="check" size={11} color="#15803D" />
            <Text style={styles.memberBadgeText}>Verified Customer</Text>
          </View>
        </View>
      </View>

      {/* ── Quick Top Cards: Orders, Plans, Addresses (No colored bubble, pure black icon) ── */}
      <View style={styles.shortcutsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate(customerRoutes.orders)}
          style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.shortcutIconWrap}>
            <Icon name="package" size={22} color="#141518" />
          </View>
          <Text style={styles.shortcutTitle}>Orders</Text>
          <Text style={styles.shortcutSub}>Past & Live</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigate(customerRoutes.dairyPlans)}
          style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.shortcutIconWrap}>
            <Icon name="repeat" size={22} color="#141518" />
          </View>
          <Text style={styles.shortcutTitle}>Plans</Text>
          <Text style={styles.shortcutSub}>Daily Milk</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigate(customerRoutes.addresses)}
          style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.shortcutIconWrap}>
            <Icon name="mapPin" size={22} color="#141518" />
          </View>
          <Text style={styles.shortcutTitle}>Addresses</Text>
          <Text style={styles.shortcutSub}>Manage</Text>
        </Pressable>
      </View>

      {/* ── Settings & Account List (Pure Black Icons, No square around icons, No outline) ── */}
      <View style={styles.groupCard}>
        {menuItems.map((item, idx) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => (item.to ? navigate(item.to) : item.onClick?.())}
            style={({ pressed }) => [
              styles.menuRow,
              idx < menuItems.length - 1 && styles.menuRowDivider,
              pressed && styles.menuRowPressed,
            ]}
          >
            <View style={styles.menuLeft}>
              <Icon name={item.icon} size={20} color="#141518" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Icon name="chevronRight" size={17} color="#9CA3AF" />
          </Pressable>
        ))}
      </View>

      {/* ── Log Out (Pure Text with Red Icon, No Box, No Outline) ───── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Out"
        onPress={logout}
        style={({ pressed }) => [styles.logoutTextWrap, pressed && { opacity: 0.6 }]}
      >
        <Icon name="logout" size={16} color="#DC2626" />
        <Text style={styles.logoutRedText}>Log Out</Text>
      </Pressable>

      {/* ── Bottom Sheets ─────────────────────────────────────────── */}
      <BottomSheet open={sheet === 'profile'} title="Personal information" onClose={() => setSheet(null)}>
        <View style={styles.sheetForm}>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <TextField label="Full name" value={name} onChangeText={setName} />
          <TextField
            label="Email"
            value={profile?.email ?? ''}
            editable={false}
            hint="Email cannot be changed here."
          />
          <TextField label="Phone" value={phone} keyboardType="phone-pad" onChangeText={setPhone} />
          <Button size="lg" block loading={busy} onPress={() => void saveProfile()}>
            Save changes
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet open={sheet === 'password'} title="Change password" onClose={() => setSheet(null)}>
        <View style={styles.sheetForm}>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <PasswordField
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button
            size="lg"
            block
            loading={busy}
            disabled={!currentPassword || !newPassword}
            onPress={() => void savePassword()}
          >
            Update password
          </Button>
        </View>
      </BottomSheet>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#141518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#141518',
    letterSpacing: -0.3,
  },
  heroEmail: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  heroPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  shortcutIconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },
  shortcutSub: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  menuRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141518',
  },
  logoutTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    marginBottom: 20,
  },
  logoutRedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  sheetForm: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
});

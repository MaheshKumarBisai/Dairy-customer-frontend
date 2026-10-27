import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  addressesApi,
  Button,
  BottomSheet,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LoadingState,
  Notice,
  TextField,
  Toggle,
  useAsync,
  useGeolocation,
  useToast,
  colors,
  radius,
  spacing,
  typography,
  type Address,
  type AddressInput,
} from '@dairy/shared';
import { CustomerShell } from '../components/customer-shell';
import { useNavigate } from '../router';

const EMPTY_FORM: AddressInput = {
  title: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false,
};

/** 18. Addresses — full CRUD against `/addresses`. */
export function CustomerAddressesScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const gps = useGeolocation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = useAsync((signal) => addressesApi.listAddresses(signal), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    setForm({
      title: address.title,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
      isDefault: address.isDefault,
    });
    setError(null);
    setOpen(true);
  };

  const set = (patch: Partial<AddressInput>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    if (busy) return;
    if (!form.title.trim() || !form.addressLine1.trim() || !form.city.trim() || !form.postalCode.trim()) {
      setError('Title, address, city and PIN code are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await addressesApi.updateAddress(editing.addressId, form);
        toast.success('Address updated');
      } else {
        await addressesApi.createAddress(form);
        toast.success('Address added');
      }
      setOpen(false);
      addresses.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the address.');
    } finally {
      setBusy(false);
    }
  };

  const selectAddress = async (address: Address) => {
    if (address.isDefault || busy) return;
    setBusy(true);
    try {
      await addressesApi.updateAddress(address.addressId, { isDefault: true });
      addresses.reload();
    } catch (err) {
      console.error('Could not select address:', err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (address: Address) => {
    setBusy(true);
    try {
      await addressesApi.deleteAddress(address.addressId);
      toast.show('Address removed');
      addresses.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the address.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomerShell
      nav={false}
      headerProps={{
        title: 'Delivery addresses',
        onBack: () => navigate(-1),
        right: <IconButton name="plus" label="Add address" onPress={openCreate} />,
      }}
      footer={
        <View style={styles.footer}>
          <Button size="lg" block leadingIcon={<Icon name="plus" size={18} color={colors.white} />} onPress={openCreate}>
            Add new address
          </Button>
        </View>
      }
    >
      {addresses.status === 'loading' ? (
        <LoadingState label="Loading addresses…" />
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
          title="No saved addresses"
          description="Add the place where you want your dairy delivered."
        />
      ) : (
        <View style={styles.stack}>
          {addresses.data!.map((address) => (
            <Pressable
              key={address.addressId}
              accessibilityRole="button"
              accessibilityState={{ selected: address.isDefault }}
              disabled={busy}
              onPress={() => void selectAddress(address)}
              style={({ pressed }) => [
                styles.addressCard,
                address.isDefault && styles.addressCardActive,
                pressed && !address.isDefault ? { opacity: 0.88, backgroundColor: '#FAFCFA' } : null,
              ]}
            >
              <View style={[styles.addressIcon, address.isDefault && styles.addressIconActive]}>
                <Icon
                  name={address.title.toLowerCase().includes('work') ? 'store' : 'home'}
                  size={19}
                  color={address.isDefault ? colors.white : colors.ink}
                />
              </View>
              <View style={styles.addressMain}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressTitle}>{address.title}</Text>
                  {address.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Icon name="check" size={11} color={colors.white} />
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  ) : (
                    <View style={styles.selectPrompt}>
                      <Text style={styles.selectPromptText}>Tap to select</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.caption}>
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                  {'\n'}
                  {address.city}, {address.state} {address.postalCode}
                </Text>
                <View style={styles.addressActions}>
                  <Pressable accessibilityRole="button" onPress={() => openEdit(address)}>
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void remove(address)}
                  >
                    <Text style={[styles.link, styles.linkDanger]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <BottomSheet
        open={open}
        title={editing ? 'Edit address' : 'Add address'}
        onClose={() => setOpen(false)}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetForm}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <Notice tone="error" icon="alert">
              {error}
            </Notice>
          ) : null}

          <TextField
            label="Save as"
            placeholder="Home, Work, Parents…"
            value={form.title}
            onChangeText={(value) => set({ title: value })}
          />
          <TextField
            label="Flat, house no., street"
            placeholder="12, Rose Villa, MG Road"
            value={form.addressLine1}
            onChangeText={(value) => set({ addressLine1: value })}
          />
          <TextField
            label="Area, landmark (optional)"
            placeholder="Near the market"
            value={form.addressLine2 ?? ''}
            onChangeText={(value) => set({ addressLine2: value })}
          />
          <View style={styles.row}>
            <TextField
              label="City"
              placeholder="Pune"
              containerStyle={styles.half}
              value={form.city}
              onChangeText={(value) => set({ city: value })}
            />
            <TextField
              label="State"
              placeholder="Maharashtra"
              containerStyle={styles.half}
              value={form.state}
              onChangeText={(value) => set({ state: value })}
            />
          </View>
          <TextField
            label="PIN code"
            keyboardType="numeric"
            placeholder="411001"
            value={form.postalCode}
            onChangeText={(value) => set({ postalCode: value })}
          />

          <View style={styles.gpsRow}>
            <View style={styles.gpsText}>
              <Text style={styles.gpsLabel}>Delivery Map Coordinates</Text>
              <Text
                style={[
                  styles.gpsValue,
                  { color: form.latitude != null ? colors.green : colors.muted2 },
                ]}
              >
                {form.latitude != null && form.longitude != null
                  ? `Lat: ${form.latitude.toFixed(4)}, Lng: ${form.longitude.toFixed(4)}`
                  : 'Coordinates not yet attached'}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="sm"
              loading={gps.loading}
              onPress={() => {
                if (gps.latitude != null && gps.longitude != null) {
                  set({ latitude: gps.latitude, longitude: gps.longitude });
                  toast.success('Current GPS coordinates attached to address');
                } else {
                  gps.refresh();
                  toast.show('Requesting device GPS coordinates…');
                }
              }}
            >
              Use GPS
            </Button>
          </View>

          <View style={styles.defaultRow}>
            <Text style={styles.defaultLabel}>Set as default address</Text>
            <Toggle
              checked={Boolean(form.isDefault)}
              onChange={(checked) => set({ isDefault: checked })}
              label="Set as default address"
            />
          </View>

          <View style={styles.btnWrap}>
            <Button size="lg" block loading={busy} onPress={() => void submit()}>
              {editing ? 'Save changes' : 'Add address'}
            </Button>
          </View>
        </ScrollView>
      </BottomSheet>
    </CustomerShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  addressCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addressCardActive: { borderColor: '#121316', backgroundColor: '#FFFFFF' },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconActive: { backgroundColor: '#121316' },
  addressMain: { flex: 1, minWidth: 0, gap: 4 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  addressTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  defaultBadge: {
    backgroundColor: '#121316',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  selectPrompt: {
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectPromptText: { color: colors.muted2, fontSize: 11, fontWeight: '700' },
  caption: { ...typography.caption, lineHeight: 17, marginTop: 2 },
  addressActions: { flexDirection: 'row', gap: spacing.lg, marginTop: 6 },
  link: { ...typography.small, color: '#121316', fontWeight: '700' },
  linkDanger: { color: colors.red },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetForm: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  btnWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface2 ?? '#f5f5f5',
    borderRadius: radius.md,
  },
  gpsText: { flex: 1, minWidth: 0, gap: 2 },
  gpsLabel: { ...typography.caption, fontWeight: '600', color: colors.ink },
  gpsValue: { ...typography.micro },
  defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  defaultLabel: { ...typography.body, fontWeight: '600' },
  footer: { paddingHorizontal: 18, paddingBottom: 16, backgroundColor: 'transparent' },
});

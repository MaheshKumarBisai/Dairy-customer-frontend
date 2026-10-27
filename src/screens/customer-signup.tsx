import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  AppShell,
  authApi,
  Icon,
  Notice,
} from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerAuth } from '../auth/customer-auth.context';
import { markOnboardingSeen } from '../bootstrap';

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const YEARS = Array.from({ length: 70 }, (_, i) => 2012 - i); // 2012 down to 1943
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** 4. Sign up — Clean design with required fields, smooth DOB popup, and country flag picker. */
export function CustomerSignupScreen() {
  const navigate = useNavigate();
  const { login } = useCustomerAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Keyboard awareness & smooth scroll handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 280);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Modals state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showDobModal, setShowDobModal] = useState(false);

  // Temporary DOB selection state
  const [tempDay, setTempDay] = useState(15);
  const [tempMonth, setTempMonth] = useState('Aug');
  const [tempYear, setTempYear] = useState(1998);

  // Animations
  const dobAnim = useRef(new Animated.Value(0)).current;
  const countryAnim = useRef(new Animated.Value(0)).current;

  // Open / Close DOB animation
  const openDobPicker = () => {
    setShowDobModal(true);
    Animated.spring(dobAnim, {
      toValue: 1,
      tension: 65,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };

  const closeDobPicker = () => {
    Animated.timing(dobAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowDobModal(false));
  };

  const confirmDob = () => {
    const monthNum = String(MONTHS.indexOf(tempMonth) + 1).padStart(2, '0');
    const dayStr = String(tempDay).padStart(2, '0');
    setDob(`${dayStr} / ${monthNum} / ${tempYear}`);
    closeDobPicker();
  };

  // Open / Close Country animation
  const openCountryPicker = () => {
    setCountrySearch('');
    setShowCountryModal(true);
    Animated.spring(countryAnim, {
      toValue: 1,
      tension: 65,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };

  const closeCountryPicker = () => {
    Animated.timing(countryAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowCountryModal(false));
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  const submit = async () => {
    if (pending) return;
    setError(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 7) {
      setError('Please enter a valid phone number with at least 7 digits.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setPending(true);
    try {
      const fullPhone = `${selectedCountry.dialCode} ${phone.trim()}`;
      await authApi.registerCustomer({
        email: email.trim(),
        password,
        name: fullName || firstName.trim(),
        phone: fullPhone,
      });

      // Sign in to store tokens & initialize session
      await login(email.trim(), password);
      markOnboardingSeen();
      navigate(customerRoutes.home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? 'An account with this email already exists.' : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not create your account right now. Please try again.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell statusLight>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 48 } : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Top Row: Back Button */}
          <View style={styles.topNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to login"
              hitSlop={12}
              onPress={() => navigate(-1)}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="arrowLeft" size={22} color="#0F1115" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Heading Section */}
          <View style={styles.headerSection}>
            <Text style={styles.headingTitle}>Register</Text>
            <Text style={styles.headingSubtitle}>Create an account to order fresh dairy!</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {error ? (
              <Notice tone="error" icon="alert">
                {error}
              </Notice>
            ) : null}

            {/* Name Row */}
            <View style={styles.nameRow}>
              {/* First Name (Required) */}
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>
            </View>

            {/* Email Address (Required) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Date of Birth Field (With smooth popup trigger) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Date of birth</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select date of birth"
                onPress={openDobPicker}
                style={({ pressed }) => [styles.inputContainer, pressed && { opacity: 0.9 }]}
              >
                <Text style={[styles.textInput, !dob && styles.placeholderText]}>
                  {dob || 'DD / MM / YYYY'}
                </Text>
                <View style={styles.iconSuffix}>
                  <Icon name="calendar" size={19} color="#6B7280" />
                </View>
              </Pressable>
            </View>

            {/* Phone with Country Flag Dropdown (Required) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Phone number</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>

              <View style={styles.phoneGroupRow}>
                {/* Country Flag & Dial Code Dropdown Picker */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Select country code, current is ${selectedCountry.name}`}
                  onPress={openCountryPicker}
                  style={({ pressed }) => [styles.countryPickerWrap, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.flagIcon}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.dialCode}</Text>
                  <Icon name="chevronDown" size={13} color="#4B5563" />
                </Pressable>

                {/* Phone Number Input */}
                <View style={[styles.inputContainer, styles.phoneInputContainer]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="98765 43210"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => {
                      setTimeout(() => scrollRef.current?.scrollTo({ y: 190, animated: true }), 120);
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Password (Required) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={10}
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Icon
                    name={showPassword ? 'eyeOff' : 'eye'}
                    size={19}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Primary CTA: Register */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Register"
              disabled={pending}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                pending && { opacity: 0.7 },
              ]}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Register</Text>
              )}
            </Pressable>
          </View>

          {/* Footer Link: Log in */}
          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>Already have an account? </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log in"
              onPress={() => navigate(customerRoutes.login)}
              hitSlop={6}
            >
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── SMOOTH ANIMATED DATE OF BIRTH POPUP ────────────────── */}
      <Modal
        visible={showDobModal}
        transparent
        animationType="none"
        onRequestClose={closeDobPicker}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalBackdropFade,
              {
                opacity: dobAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDobPicker} />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [
                  {
                    translateY: dobAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [360, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Date of Birth</Text>
                <Text style={styles.sheetSub}>Choose your birth day, month and year</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeDobPicker}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Icon name="x" size={18} color="#141518" />
              </Pressable>
            </View>

            {/* Current Selected Display */}
            <View style={styles.dobSelectedBox}>
              <Icon name="calendar" size={16} color="#15803D" />
              <Text style={styles.dobSelectedText}>
                {String(tempDay).padStart(2, '0')} {tempMonth} {tempYear}
              </Text>
            </View>

            {/* Date Picker Wheels / Grid */}
            <View style={styles.pickerColumnsRow}>
              {/* Day Column */}
              <View style={styles.pickerCol}>
                <Text style={styles.colLabel}>DAY</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setTempDay(d)}
                      style={[styles.pickerItem, tempDay === d && styles.pickerItemActive]}
                    >
                      <Text style={[styles.pickerItemText, tempDay === d && styles.pickerItemTextActive]}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.pickerCol}>
                <Text style={styles.colLabel}>MONTH</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setTempMonth(m)}
                      style={[styles.pickerItem, tempMonth === m && styles.pickerItemActive]}
                    >
                      <Text style={[styles.pickerItemText, tempMonth === m && styles.pickerItemTextActive]}>
                        {m}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.pickerCol}>
                <Text style={styles.colLabel}>YEAR</Text>
                <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => setTempYear(y)}
                      style={[styles.pickerItem, tempYear === y && styles.pickerItemActive]}
                    >
                      <Text style={[styles.pickerItemText, tempYear === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={confirmDob}
                style={styles.sheetConfirmBtn}
              >
                <Text style={styles.sheetConfirmText}>Confirm Date</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── SMOOTH ANIMATED COUNTRY FLAG DROPDOWN MODAL ────────── */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="none"
        onRequestClose={closeCountryPicker}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalBackdropFade,
              {
                opacity: countryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeCountryPicker} />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalSheet,
              {
                maxHeight: '80%',
                transform: [
                  {
                    translateY: countryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [450, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Country Code</Text>
                <Text style={styles.sheetSub}>Choose your country dial code</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeCountryPicker}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Icon name="x" size={18} color="#141518" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.countrySearchRow}>
              <Icon name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.countrySearchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#9CA3AF"
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {countrySearch ? (
                <Pressable onPress={() => setCountrySearch('')} hitSlop={8}>
                  <Icon name="x" size={14} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>

            {/* Countries List */}
            <ScrollView style={styles.countryListScroll} showsVerticalScrollIndicator={false}>
              {filteredCountries.map((c) => {
                const isSelected = selectedCountry.code === c.code;
                return (
                  <Pressable
                    key={c.code}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedCountry(c);
                      closeCountryPicker();
                    }}
                    style={({ pressed }) => [
                      styles.countryItem,
                      isSelected && styles.countryItemActive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.countryItemFlag}>{c.flag}</Text>
                    <Text style={styles.countryItemName}>{c.name}</Text>
                    <Text style={styles.countryItemDial}>{c.dialCode}</Text>
                    {isSelected ? (
                      <Icon name="check" size={16} color="#15803D" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  topNavRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headingTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F1115',
    letterSpacing: -0.5,
  },
  headingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '400',
  },
  formSection: {
    gap: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#141518',
  },
  requiredStar: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  inputContainer: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  iconSuffix: {
    paddingLeft: 8,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 8,
  },
  phoneGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryPickerWrap: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagIcon: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#141518',
  },
  phoneInputContainer: {
    flex: 1,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#141518',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerPrompt: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141518',
  },

  /* Modal Backdrop & Sheet */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropFade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#141518',
  },
  sheetSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* DOB Picker */
  dobSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 12,
  },
  dobSelectedText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  pickerColumnsRow: {
    flexDirection: 'row',
    height: 200,
    gap: 10,
  },
  pickerCol: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  colScroll: {
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: '#141518',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sheetActions: {
    marginTop: 8,
  },
  sheetConfirmBtn: {
    height: 48,
    backgroundColor: '#141518',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Country Picker */
  countrySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#141518',
    paddingVertical: 0,
  },
  countryListScroll: {
    maxHeight: 280,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  countryItemActive: {
    backgroundColor: '#F9FAFB',
  },
  countryItemFlag: {
    fontSize: 22,
  },
  countryItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#141518',
  },
  countryItemDial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
});

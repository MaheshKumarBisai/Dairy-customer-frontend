import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ApiError,
  AppShell,
  BrandLogo,
  Icon,
  Notice,
} from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useNavigate } from '../router';
import { useCustomerAuth } from '../auth/customer-auth.context';
import { markOnboardingSeen } from '../bootstrap';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </Svg>
  );
}

/** 3. Login — Clean, modern customer login screen aligned with brand theme. */
export function CustomerLoginScreen() {
  const navigate = useNavigate();
  const { login } = useCustomerAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);



  const submit = async () => {
    if (pending) return;
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      markOnboardingSeen();
      navigate(customerRoutes.home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.isUnauthorized
            ? 'Those credentials don’t match an account. Check your email and password.'
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Could not reach DairyFresh right now. Please try again.');
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
        {/* Soft Ambient Brand Glow at Top */}
        <View style={styles.ambientTopGlow} pointerEvents="none" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Emblem Badge */}
          <View style={styles.topBadgeWrap}>
            <View style={styles.brandBadge}>
              <BrandLogo size={66} variant="circle" />
            </View>
          </View>

          {/* Heading Section */}
          <View style={styles.headerSection}>
            <Text style={styles.headingTitle}>Sign in to your{'\n'}Account</Text>
            <Text style={styles.headingSubtitle}>Enter your email and password to log in</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {error ? (
              <Notice tone="error" icon="alert">
                {error}
              </Notice>
            ) : null}

            {/* Email Field */}
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

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
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
                  size={20}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.metaRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Remember me"
                onPress={() => setRememberMe((prev) => !prev)}
                style={styles.rememberWrap}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe ? <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forgot Password"
                onPress={() => navigate(customerRoutes.forgotPassword)}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Forgot Password ?</Text>
              </Pressable>
            </View>

            {/* Primary CTA: Log In */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log In"
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
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </Pressable>

            {/* Divider: Or */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Logins */}
            <View style={styles.socialGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.88 }]}
                onPress={() => undefined}
              >
                <GoogleIcon size={20} />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Facebook"
                style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.88 }]}
                onPress={() => undefined}
              >
                <FacebookIcon size={20} />
                <Text style={styles.socialBtnText}>Continue with Facebook</Text>
              </Pressable>
            </View>
          </View>

          {/* Footer Link: Sign Up */}
          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>Don't have an account? </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Up"
              onPress={() => navigate(customerRoutes.signup)}
              hitSlop={6}
            >
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 380,
    height: 260,
    borderRadius: 190,
    backgroundColor: '#F4FEDB',
    opacity: 0.9,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topBadgeWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F1115',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  headingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '400',
  },
  formSection: {
    gap: 16,
  },
  inputContainer: {
    height: 54,
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
  eyeBtn: {
    padding: 6,
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#141518',
    borderColor: '#141518',
  },
  rememberText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: '#141518',
    fontWeight: '600',
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#141518',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  socialGroup: {
    gap: 12,
  },
  socialBtn: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
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
});

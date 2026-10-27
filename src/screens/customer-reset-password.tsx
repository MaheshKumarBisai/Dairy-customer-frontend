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
import {
  ApiError,
  AppShell,
  BrandLogo,
  Icon,
  Notice,
  authApi,
} from '@dairy/shared';
import { customerRoutes } from '../customer-routes';
import { useNavigate, useParams } from '../router';

export function CustomerResetPasswordScreen() {
  const navigate = useNavigate();
  const { email: paramEmail, token: paramToken } = useParams<{ email?: string; token?: string }>();

  const email = (paramEmail || '').trim();
  const resetToken = (paramToken || '').trim();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    if (pending) return;
    setError(null);
    setSuccess(null);

    if (!resetToken) {
      setError('Invalid or expired reset session. Please request a new OTP.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setPending(true);
    try {
      await authApi.resetPassword({
        email,
        resetToken,
        newPassword,
      });

      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate(customerRoutes.login, { replace: true });
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Could not reset password.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not reset password. Please try again.');
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
        <View style={styles.ambientTopGlow} pointerEvents="none" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Row: Back Button */}
          <View style={styles.topNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => navigate(customerRoutes.forgotPassword)}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="arrowLeft" size={22} color="#0F1115" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Brand Emblem */}
          <View style={styles.topBadgeWrap}>
            <View style={styles.brandBadge}>
              <BrandLogo size={66} variant="circle" />
            </View>
          </View>

          {/* Heading Section */}
          <View style={styles.headerSection}>
            <Text style={styles.headingTitle}>Set New Password</Text>
            <Text style={styles.headingSubtitle}>
              {email ? `Create a new password for ${email}` : 'Create a strong, new password for your account.'}
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {error ? (
              <Notice tone="error" icon="alert">
                {error}
              </Notice>
            ) : null}

            {success ? (
              <View style={styles.successBanner}>
                <Icon name="check" size={16} color="#059669" strokeWidth={2.4} />
                <Text style={styles.successBannerText}>{success}</Text>
              </View>
            ) : null}

            {/* New Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!pending}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Icon
                    name={showNewPassword ? 'eyeOff' : 'eye'}
                    size={19}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm New Password *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!pending}
                  onSubmitEditing={() => void handleSubmit()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Icon
                    name={showConfirmPassword ? 'eyeOff' : 'eye'}
                    size={19}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Primary CTA: Save New Password */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save New Password"
              disabled={pending}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                pending && { opacity: 0.7 },
              ]}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Save New Password</Text>
              )}
            </Pressable>
          </View>

          {/* Footer Back to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>Already have an account? </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log In"
              onPress={() => navigate(customerRoutes.login)}
              hitSlop={6}
            >
              <Text style={styles.footerLink}>Log In</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 32,
    alignItems: 'center',
  },
  headingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F1115',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  formSection: {
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
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
    color: '#0F1115',
    padding: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#141518',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
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

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/auth/AuthContext';
import { SPACING, RADIUS } from '../src/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const validateInputs = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'Please enter an email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }
    if (!password) {
      return 'Please enter a password.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleRegister = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await signUpWithEmail(email, password);
      setRegisteredSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/welcome')}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>CREATE ACCOUNT</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>Join Solvanta</Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Create your decentralized energy profile
          </Text>
        </View>

        {/* Success Banner */}
        {registeredSuccess ? (
          <View style={[styles.successBanner, { backgroundColor: 'rgba(77, 225, 162, 0.12)', borderColor: tokens.green }]}>
            <CheckCircle2 size={24} color={tokens.green} style={{ marginBottom: 8 }} />
            <Text style={[styles.successTitle, { color: tokens.green }]}>Account Created Successfully!</Text>
            <Text style={[styles.successDesc, { color: tokens.textPrimary }]}>
              A verification link has been sent to {email}. You can verify your email anytime from Account Settings.
            </Text>
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: tokens.lime }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.continueBtnText, { color: tokens.onLime }]}>Enter Solvanta</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 98, 106, 0.12)', borderColor: tokens.red }]}>
            <Text style={[styles.errorText, { color: tokens.red }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {!registeredSuccess ? (
          <>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Mail size={18} color={tokens.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: tokens.textPrimary }]}
                  placeholder="engineer@solvanta.energy"
                  placeholderTextColor={tokens.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>PASSWORD (MIN 8 CHARS)</Text>
              <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Lock size={18} color={tokens.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: tokens.textPrimary }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={tokens.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconBtn}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={tokens.textMuted} />
                  ) : (
                    <Eye size={18} color={tokens.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Lock size={18} color={tokens.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: tokens.textPrimary }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={tokens.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIconBtn}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={tokens.textMuted} />
                  ) : (
                    <Eye size={18} color={tokens.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Account Primary CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: tokens.lime }]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={tokens.onLime} size="small" />
              ) : (
                <>
                  <UserPlus size={18} color={tokens.onLime} style={{ marginRight: 8 }} />
                  <Text style={[styles.primaryBtnText, { color: tokens.onLime }]}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer Link to Login */}
            <View style={styles.footerRow}>
              <Text style={{ color: tokens.textMuted, fontSize: 13 }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={{ color: tokens.lime, fontSize: 13, fontWeight: '700' }}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.horizontalPadding,
    paddingBottom: SPACING.xxl,
  },
  titleContainer: {
    marginVertical: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  successBanner: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.cardPadding,
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  continueBtn: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorBanner: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.lg,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  eyeIconBtn: {
    padding: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

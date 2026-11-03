import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Globe,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/auth/AuthContext';
import { SPACING, RADIUS } from '../src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { signInWithEmail, signInWithGoogle, continueAsGuest, isGoogleAvailable } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      setErrorMessage(null);

      if (!isGoogleAvailable) {
        Alert.alert(
          'Android Development Build Required',
          'Native Google Sign-In requires an Android development build with Google Play Services. In Expo Go, please use Email/Password authentication or Continue Without Account.',
          [{ text: 'OK' }]
        );
        return;
      }

      const res = await signInWithGoogle();
      if (res.success) {
        router.replace('/(tabs)');
      } else if (res.error && !res.cancelled) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in error occurred.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuestEntry = async () => {
    try {
      setErrorMessage(null);
      await continueAsGuest();
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start guest session.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/welcome')}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Back to welcome"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>SIGN IN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Sign in with your Solvanta Firebase credentials
          </Text>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: tokens.redTint, borderColor: tokens.red }]}>
            <Text style={[styles.errorText, { color: tokens.redText }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>EMAIL ADDRESS</Text>
          <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Mail size={18} color={tokens.textSecondary} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="Email address"
              style={[styles.textInput, { color: tokens.textPrimary }]}
              placeholder="user@example.com"
              placeholderTextColor={tokens.textSecondary}
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
          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>PASSWORD</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/forgot-password')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
              <Text style={[styles.forgotText, { color: tokens.limeText }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Lock size={18} color={tokens.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: tokens.textPrimary }]}
              accessibilityLabel="Password"
              placeholder="Enter your password"
              placeholderTextColor={tokens.textSecondary}
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
              accessibilityRole="button"
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIconBtn}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={18} color={tokens.textSecondary} />
              ) : (
                <Eye size={18} color={tokens.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign In Primary CTA */}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.primaryBtn, { backgroundColor: tokens.lime }]}
          activeOpacity={0.85}
          onPress={handleEmailLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={tokens.onLime} size="small" />
          ) : (
            <>
              <LogIn size={18} color={tokens.onLime} style={{ marginRight: 8 }} />
              <Text style={[styles.primaryBtnText, { color: tokens.onLime }]}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
          <Text style={[styles.dividerText, { color: tokens.textSecondary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
        </View>

        {/* Google Sign In */}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.googleBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          activeOpacity={0.85}
          onPress={handleGoogleSignIn}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? (
            <ActivityIndicator color={tokens.limeText} size="small" />
          ) : (
            <>
              <Globe size={18} color={tokens.cyanText} style={{ marginRight: 8 }} />
              <Text style={[styles.googleBtnText, { color: tokens.textPrimary }]}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Continue Without Account */}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.guestBtn, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}
          activeOpacity={0.85}
          onPress={handleGuestEntry}
        >
          <ShieldCheck size={18} color={tokens.limeText} style={{ marginRight: 8 }} />
          <Text style={[styles.guestBtnText, { color: tokens.limeText }]}>
            Continue Without Account (Guest Mode)
          </Text>
        </TouchableOpacity>

        {/* Footer Link to Register */}
        <View style={styles.footerRow}>
          <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>Don't have an account? </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/register')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
            <Text style={{ color: tokens.limeText, fontSize: 13, fontWeight: '700' }}>Create Account</Text>
          </TouchableOpacity>
        </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
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
    alignSelf: 'stretch',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 11,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
});

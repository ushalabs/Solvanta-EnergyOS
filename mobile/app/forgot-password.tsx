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
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/auth/AuthContext';
import { SPACING, RADIUS } from '../src/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await sendPasswordReset(trimmed);
      setSentSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send password reset email.');
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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Back to sign in"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>RESET PASSWORD</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>Account Recovery</Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Enter your email and we'll send you a secure Firebase link to reset your password.
          </Text>
        </View>

        {sentSuccess ? (
          <View style={[styles.successBanner, { backgroundColor: 'rgba(77, 225, 162, 0.12)', borderColor: tokens.green }]}>
            <CheckCircle2 size={28} color={tokens.green} style={{ marginBottom: 10 }} />
            <Text style={[styles.successTitle, { color: tokens.green }]}>Reset Link Sent</Text>
            <Text style={[styles.successDesc, { color: tokens.textPrimary }]}>
              If an account exists for {email}, you will receive a password reset link shortly. Please check your inbox and spam folder.
            </Text>
            <TouchableOpacity
              style={[styles.backToLoginBtn, { backgroundColor: tokens.lime }]}
              onPress={() => router.replace('/login')}
            >
              <Text style={[styles.backToLoginBtnText, { color: tokens.onLime }]}>Return to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 98, 106, 0.12)', borderColor: tokens.red }]}>
                <Text style={[styles.errorText, { color: tokens.red }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>REGISTERED EMAIL</Text>
              <View style={[styles.inputContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Mail size={18} color={tokens.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: tokens.textPrimary }]}
                  placeholder="user@example.com"
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

            {/* Send Reset Link Action */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: tokens.lime }]}
              activeOpacity={0.85}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={tokens.onLime} size="small" />
              ) : (
                <>
                  <Send size={18} color={tokens.onLime} style={{ marginRight: 8 }} />
                  <Text style={[styles.primaryBtnText, { color: tokens.onLime }]}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.replace('/login')}
            >
              <Text style={[styles.cancelBtnText, { color: tokens.textSecondary }]}>Cancel and Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
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
    marginTop: 6,
    lineHeight: 18,
  },
  successBanner: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.cardPadding,
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
  backToLoginBtn: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginBtnText: {
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
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

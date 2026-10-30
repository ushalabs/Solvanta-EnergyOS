import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, ShieldCheck, Mail, LogIn, UserPlus, Globe, Sparkles } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/auth/AuthContext';
import { SPACING, RADIUS } from '../src/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const { continueAsGuest, signInWithGoogle, isGoogleAvailable } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGuestEntry = async () => {
    try {
      setLoadingGuest(true);
      setErrorMessage(null);
      await continueAsGuest();
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize offline guest mode.');
    } finally {
      setLoadingGuest(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoWell, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}>
            <Zap size={36} color={tokens.lime} />
          </View>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>SOLVANTA</Text>
          <Text style={[styles.titleAccent, { color: tokens.lime }]}>ENERGYOS</Text>
          <Text style={[styles.tagline, { color: tokens.textSecondary }]}>
            Intelligent Decentralized Microgrid Operating System
          </Text>
        </View>

        {/* Feature Badges Card */}
        <View style={[styles.featureCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.featureRow}>
            <ShieldCheck size={18} color={tokens.lime} style={{ marginRight: 10 }} />
            <Text style={[styles.featureText, { color: tokens.textPrimary }]}>
              Offline-First Local Twin & Private Storage
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Sparkles size={18} color={tokens.cyan} style={{ marginRight: 10 }} />
            <Text style={[styles.featureText, { color: tokens.textPrimary }]}>
              Solar, Inverter, Battery & Resilient Dispatch
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Globe size={18} color={tokens.green} style={{ marginRight: 10 }} />
            <Text style={[styles.featureText, { color: tokens.textPrimary }]}>
              Optional Firebase Cloud Identity Sync
            </Text>
          </View>
        </View>

        {/* Error message banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 98, 106, 0.12)', borderColor: tokens.red }]}>
            <Text style={[styles.errorText, { color: tokens.red }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Sign In Primary */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: tokens.lime }]}
            activeOpacity={0.85}
            onPress={() => router.push('/login')}
          >
            <LogIn size={18} color={tokens.onLime} style={{ marginRight: 8 }} />
            <Text style={[styles.primaryBtnText, { color: tokens.onLime }]}>Sign In</Text>
          </TouchableOpacity>

          {/* Create Account Secondary */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}
            activeOpacity={0.85}
            onPress={() => router.push('/register')}
          >
            <UserPlus size={18} color={tokens.textPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryBtnText, { color: tokens.textPrimary }]}>Create Account</Text>
          </TouchableOpacity>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? (
              <ActivityIndicator color={tokens.lime} size="small" />
            ) : (
              <>
                <Globe size={18} color={tokens.cyan} style={{ marginRight: 8 }} />
                <Text style={[styles.googleBtnText, { color: tokens.textPrimary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
            <Text style={[styles.dividerText, { color: tokens.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
          </View>

          {/* Continue Without Account (Mandatory Offline Guest Mode) */}
          <TouchableOpacity
            style={[styles.guestBtn, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.lime }]}
            activeOpacity={0.85}
            onPress={handleGuestEntry}
            disabled={loadingGuest}
          >
            {loadingGuest ? (
              <ActivityIndicator color={tokens.lime} size="small" />
            ) : (
              <>
                <ShieldCheck size={18} color={tokens.lime} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[styles.guestBtnTitle, { color: tokens.lime }]}>
                    Continue Without Account
                  </Text>
                  <Text style={[styles.guestBtnSubtitle, { color: tokens.textMuted }]}>
                    Offline Local-Only Mode • No cloud registration required
                  </Text>
                </View>
              </>
            )}
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
  scrollContent: {
    paddingHorizontal: SPACING.horizontalPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  logoWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  titleAccent: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
  },
  tagline: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 280,
    lineHeight: 18,
  },
  featureCard: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: SPACING.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  secondaryBtnText: {
    fontSize: 15,
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
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.cardPadding,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  guestBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guestBtnSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

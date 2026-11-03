import React, { useState, useEffect } from 'react';
import { APP_RUNTIME } from '../src/config/runtime';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Moon,
  Sun,
  CheckCircle,
  Database,
  Cpu,
  User,
  LogOut,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  LogIn,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuth } from '../src/auth/AuthContext';
import { SPACING, RADIUS } from '../src/theme/tokens';
import { BuildingEquipmentEditor } from '../src/components/BuildingEquipmentEditor';

export default function SettingsScreen() {
  const router = useRouter();
  const { tokens, setTheme, isDark } = useTheme();
  const {
    user,
    guestIdentity,
    authMode,
    emailVerified,
    sendVerificationEmail,
    reloadUser,
    signOut,
  } = useAuth();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [reloadingStatus, setReloadingStatus] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendVerificationEmail();
      setResendStatus('Verification email sent! Check your inbox.');
      setResendCooldown(60);
    } catch (err: any) {
      setResendStatus(err?.message || 'Failed to send verification email.');
    }
  };

  const handleReloadUser = async () => {
    try {
      setReloadingStatus(true);
      await reloadUser();
      setResendStatus('Account status refreshed.');
    } catch (err: any) {
      setResendStatus(err?.message || 'Failed to refresh status.');
    } finally {
      setReloadingStatus(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const isGoogle = user?.providerData?.some((p) => p.providerId === 'google.com');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Back to app"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[styles.title, { color: tokens.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={{ color: tokens.limeText, fontSize: 12, lineHeight: 17, fontWeight: '600', marginBottom: 4 }}>
          LIVE TWIN • Authenticated building and equipment configuration
        </Text>

        {/* Account & Profile Section */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Account and identity
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {authMode === 'firebase' && user ? (
            <>
              {/* Signed-in Firebase User */}
              <View style={styles.profileHeader}>
                <View style={[styles.avatarWell, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}>
                  {isGoogle ? (
                    <Globe size={20} color={tokens.cyanText} />
                  ) : (
                    <User size={20} color={tokens.limeText} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userName, { color: tokens.textPrimary }]}>
                    {user.displayName || user.email?.split('@')[0] || 'Solvanta User'}
                  </Text>
                  <Text style={[styles.userEmail, { color: tokens.textSecondary }]}>
                    {user.email}
                  </Text>
                </View>
                <View
                  style={[
                    styles.providerBadge,
                    {
                      backgroundColor: isGoogle
                        ? tokens.cyanTint
                        : tokens.limeTint,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.providerBadgeText,
                      { color: isGoogle ? tokens.cyanText : tokens.limeText },
                    ]}
                  >
                    {isGoogle ? 'GOOGLE' : 'EMAIL/PWD'}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.divider }]} />

              {/* Email Verification Status Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Mail size={16} color={emailVerified ? tokens.greenText : tokens.amberText} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Email Verification</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {emailVerified ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckCircle2 size={14} color={tokens.greenText} style={{ marginRight: 4 }} />
                      <Text style={[styles.infoVal, { color: tokens.greenText }]}>VERIFIED</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AlertCircle size={14} color={tokens.amberText} style={{ marginRight: 4 }} />
                      <Text style={[styles.infoVal, { color: tokens.amberText }]}>UNVERIFIED</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Verification Actions if unverified */}
              {!emailVerified ? (
                <View style={[styles.verifyActionsBox, { backgroundColor: tokens.surfaceElevated }]}>
                  <Text style={[styles.verifyHint, { color: tokens.textSecondary }]}>
                    Please verify your email address to enable security alerts and full cloud capabilities.
                  </Text>
                  <View style={styles.verifyBtnRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.verifyBtn,
                        {
                          backgroundColor: resendCooldown > 0 ? tokens.border : tokens.lime,
                        },
                      ]}
                      onPress={handleResendVerification}
                      disabled={resendCooldown > 0}
                    >
                      <Text
                        style={[
                          styles.verifyBtnText,
                          { color: resendCooldown > 0 ? tokens.textSecondary : tokens.onLime },
                        ]}
                      >
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend Verification Email'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.reloadBtn, { borderColor: tokens.border }]}
                      onPress={handleReloadUser}
                      disabled={reloadingStatus}
                    >
                      {reloadingStatus ? (
                        <ActivityIndicator color={tokens.limeText} size="small" />
                      ) : (
                        <>
                          <RefreshCw size={14} color={tokens.textPrimary} style={{ marginRight: 4 }} />
                          <Text style={[styles.reloadBtnText, { color: tokens.textPrimary }]}>
                            Refresh
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {resendStatus ? (
                <Text style={[styles.resendStatusText, { color: tokens.cyanText }]}>
                  {resendStatus}
                </Text>
              ) : null}

              <View style={[styles.divider, { backgroundColor: tokens.divider }]} />

              {/* Sign Out Action */}
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.signOutRow}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <LogOut size={16} color={tokens.redText} style={{ marginRight: 8 }} />
                <Text style={[styles.signOutText, { color: tokens.redText }]}>Sign Out of Solvanta</Text>
              </TouchableOpacity>
            </>
          ) : authMode === 'guest' ? (
            <>
              {/* Local-Only Guest Mode */}
              <View style={styles.profileHeader}>
                <View style={[styles.avatarWell, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}>
                  <ShieldCheck size={20} color={tokens.limeText} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userName, { color: tokens.textPrimary }]}>
                    {guestIdentity?.displayName || 'Offline Guest User'}
                  </Text>
                  <Text style={[styles.userEmail, { color: tokens.textSecondary }]}>
                    Local ID: {guestIdentity?.guestId?.substring(0, 18)}...
                  </Text>
                </View>
                <View style={[styles.providerBadge, { backgroundColor: tokens.limeTint }]}>
                  <Text style={[styles.providerBadgeText, { color: tokens.limeText }]}>GUEST MODE</Text>
                </View>
              </View>

              <Text style={[styles.guestNotice, { color: tokens.textSecondary }]}>
                You are using Solvanta in Local-Only Mode. Electrical models, simulation runs, and appliance configs are stored securely on this device without cloud sync.
              </Text>

              <View style={[styles.divider, { backgroundColor: tokens.divider }]} />

              <View style={styles.guestBtnGroup}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.linkAccountBtn, { backgroundColor: tokens.lime }]}
                  onPress={() => router.push('/login')}
                  activeOpacity={0.85}
                >
                  <LogIn size={16} color={tokens.onLime} style={{ marginRight: 6 }} />
                  <Text style={[styles.linkAccountBtnText, { color: tokens.onLime }]}>
                    Sign In or Link Account
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.exitGuestBtn, { borderColor: tokens.border }]}
                  onPress={handleSignOut}
                  activeOpacity={0.85}
                >
                  <LogOut size={16} color={tokens.redText} style={{ marginRight: 6 }} />
                  <Text style={[styles.exitGuestBtnText, { color: tokens.redText }]}>
                    Exit Guest Session
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.profileHeader}>
              <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>
                No active session. Please sign in or continue as guest.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.linkAccountBtn, { backgroundColor: tokens.lime, marginTop: 10 }]}
                onPress={() => router.push('/welcome')}
              >
                <Text style={[styles.linkAccountBtnText, { color: tokens.onLime }]}>Open Welcome</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Building & Equipment Profile Section */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Building and equipment twin
        </Text>
        <BuildingEquipmentEditor />

        {/* Appearance Section */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Appearance
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {/* Dark Mode Row */}
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityLabel="Dark Neon-Lime theme"
            accessibilityState={{ checked: isDark }}
            aria-checked={isDark}
            activeOpacity={0.8}
            onPress={() => setTheme('dark')}
            style={[styles.themeOption, isDark && { backgroundColor: tokens.surfaceElevated }]}
          >
            <View style={styles.themeLeft}>
              <Moon size={18} color={isDark ? tokens.limeText : tokens.textSecondary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeTitle, { color: tokens.textPrimary }]}>
                  Dark Neon-Lime
                </Text>
                <Text style={[styles.themeDesc, { color: tokens.textSecondary }]}>
                  Default on first launch • Reference matched near-black
                </Text>
              </View>
            </View>
            {isDark && <CheckCircle size={18} color={tokens.limeText} />}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: tokens.divider }]} />

          {/* Light Mode Row */}
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityLabel="Light Solar theme"
            accessibilityState={{ checked: !isDark }}
            aria-checked={!isDark}
            activeOpacity={0.8}
            onPress={() => setTheme('light')}
            style={[styles.themeOption, !isDark && { backgroundColor: tokens.surfaceElevated }]}
          >
            <View style={styles.themeLeft}>
              <Sun size={18} color={!isDark ? tokens.limeText : tokens.textSecondary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeTitle, { color: tokens.textPrimary }]}>
                  Light Solar
                </Text>
                <Text style={[styles.themeDesc, { color: tokens.textSecondary }]}>
                  Clean daylight contrast • Persisted across app restarts
                </Text>
              </View>
            </View>
            {!isDark && <CheckCircle size={18} color={tokens.limeText} />}
          </TouchableOpacity>
        </View>

        {/* Units Configuration */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Engineering units and conventions
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Power Measurement</Text>
            <Text style={[styles.infoVal, { color: tokens.limeText }]}>Kilowatts (kW) / Watts (W)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.divider }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Energy Accumulation</Text>
            <Text style={[styles.infoVal, { color: tokens.limeText }]}>Kilowatt-hours (kWh)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.divider }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Simulation Resolution</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>15-Minute Parameterized Step</Text>
          </View>
        </View>

        {/* Data Provenance & Safety Boundaries */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Provenance and hardware boundaries
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Database size={16} color={tokens.amberText} style={{ marginRight: 8 }} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Data Mode</Text>
            </View>
            <Text style={[styles.infoVal, { color: tokens.amberText }]}>SIMULATED (FYP-I)</Text>
          </View>
          <Text style={[styles.noticeText, { color: tokens.textSecondary }]}>
            Building and appliance records are saved through the authenticated API. Energy runs and telemetry observations are explicitly simulated. Physical inverter integration and electrical controls remain outside this prototype.
          </Text>
        </View>

        {/* Toolchain & SDK Versions */}
        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: tokens.textPrimary }]}>
          Toolchain and architecture
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Cpu size={16} color={tokens.limeText} style={{ marginRight: 8 }} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Expo SDK Version</Text>
            </View>
            <Text style={[styles.infoVal, { color: tokens.limeText }]}>Expo {APP_RUNTIME.expo} • SDK 57</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.divider }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>React Native Engine</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>{APP_RUNTIME.reactNative}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: tokens.divider }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Decision Engine</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>Google OR-Tools CP-SAT</Text>
          </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.cardPadding,
  },
  avatarWell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifyActionsBox: {
    padding: SPACING.cardPadding,
    marginHorizontal: SPACING.cardPadding,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
  },
  verifyHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  verifyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  reloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resendStatusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: SPACING.cardPadding,
    marginBottom: SPACING.sm,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.cardPadding,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guestNotice: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: SPACING.cardPadding,
  },
  guestBtnGroup: {
    padding: SPACING.cardPadding,
    gap: 8,
  },
  linkAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: RADIUS.md,
  },
  linkAccountBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  exitGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  exitGuestBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.cardPadding,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.cardPadding,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoVal: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: SPACING.cardPadding,
  },
});

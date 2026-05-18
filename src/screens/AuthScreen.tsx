import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { isAppleAuthAvailable, signInWithApple } from '../lib/auth';
import { setUsername } from '../lib/scores';
import { colors, fonts, radius } from '../theme/tokens';

const RL_KEY = 'auth_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SCHEDULE = [30, 60, 120, 300, 900, 3600];

async function getLockedSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(RL_KEY);
    if (!raw) return 0;
    const s = JSON.parse(raw);
    return s.lockedUntil > Date.now() ? Math.ceil((s.lockedUntil - Date.now()) / 1000) : 0;
  } catch { return 0; }
}

async function recordAuthFailure(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(RL_KEY);
    const s = raw ? JSON.parse(raw) : { failures: 0, lockouts: 0, lockedUntil: 0 };
    s.failures = (s.failures || 0) + 1;
    if (s.failures >= MAX_ATTEMPTS) {
      const idx = Math.min(s.lockouts || 0, LOCKOUT_SCHEDULE.length - 1);
      s.lockedUntil = Date.now() + LOCKOUT_SCHEDULE[idx] * 1000;
      s.lockouts = (s.lockouts || 0) + 1;
      s.failures = 0;
    }
    await AsyncStorage.setItem(RL_KEY, JSON.stringify(s));
  } catch {}
}

async function clearAuthRateLimit(): Promise<void> {
  try { await AsyncStorage.removeItem(RL_KEY); } catch {}
}

type Mode = 'signin' | 'signup' | 'reset';

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Fel e-post eller lösenord.',
  'User already registered': 'Det finns redan ett konto med den e-postadressen.',
  'Password should be at least 6 characters': 'Lösenordet måste vara minst 6 tecken.',
  'Unable to validate email address: invalid format': 'Ogiltig e-postadress.',
  'Email not confirmed': 'Du behöver bekräfta din e-post innan du kan logga in.',
};

function mapError(msg: string): string {
  return ERROR_MAP[msg] ?? 'Något gick fel. Försök igen.';
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Ange din e-postadress.');
      return;
    }

    const secondsLocked = await getLockedSeconds();
    if (secondsLocked > 0) {
      setError(`För många misslyckade försök. Vänta ${secondsLocked} sekunder.`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      });
      if (error) {
        await recordAuthFailure();
        setError(mapError(error.message));
      } else {
        setResetSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const secondsLocked = await getLockedSeconds();
    if (secondsLocked > 0) {
      setError(`För många misslyckade försök. Vänta ${secondsLocked} sekunder.`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          console.error('[Auth] signIn error:', error.status, error.message);
          await recordAuthFailure();
          setError(mapError(error.message));
        } else {
          await clearAuthRateLimit();
          await AsyncStorage.setItem('keepSignedIn', keepSignedIn ? 'true' : 'false');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          ...(Platform.OS === 'web' && {
            options: { emailRedirectTo: window.location.origin },
          }),
        });
        if (error) {
          console.error('[Auth] signUp error:', error.status, error.message, error);
          await recordAuthFailure();
          setError(mapError(error.message));
        } else if (!data.session) {
          setAwaitingConfirm(true);
        }
      }
    } catch (e: any) {
      console.error('[Auth] unexpected exception:', e);
      await recordAuthFailure();
      setError('Något gick fel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError(null);
    try {
      const { username } = await signInWithApple();
      if (username) {
        try { await setUsername(username); } catch {}
      }
      // App.tsx switches to main stack via onAuthStateChange
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple-inloggning misslyckades. Försök igen.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  if (awaitingConfirm) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmEmoji}>📧</Text>
          <Text style={styles.confirmTitle}>Kontrollera din e-post</Text>
          <Text style={styles.confirmBody}>
            {'Vi har skickat en bekräftelselänk till\n'}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>
            {'\n\nKlicka på länken för att aktivera ditt konto och sedan logga in.'}
          </Text>
          <TouchableOpacity
            onPress={() => { setAwaitingConfirm(false); switchMode('signin'); }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Gå till inloggning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'reset' && resetSent) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmEmoji}>🔑</Text>
          <Text style={styles.confirmTitle}>Länk skickad!</Text>
          <Text style={styles.confirmBody}>
            {'Vi har skickat en länk för att återställa lösenordet till\n'}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>
            {'\n\nKontrollera din inkorg och följ instruktionerna.'}
          </Text>
          <TouchableOpacity
            onPress={() => switchMode('signin')}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Gå till inloggning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.tagline}>Quiz för restaurangfolk</Text>
          </View>

          {mode === 'reset' ? (
            <>
              <TouchableOpacity onPress={() => switchMode('signin')} style={styles.resetBackRow}>
                <Text style={styles.resetBackText}>← Tillbaka</Text>
              </TouchableOpacity>
              <Text style={styles.resetTitle}>Återställ lösenord</Text>
              <Text style={styles.resetBody}>
                Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-postadress"
                placeholderTextColor={colors.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={!loading ? handleResetPassword : undefined}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity
                onPress={handleResetPassword}
                style={[styles.submitBtn, (!email.trim() || loading) && styles.submitBtnDisabled]}
                disabled={!email.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#1a0010" />
                  : <Text style={styles.submitText}>Skicka återställningslänk</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.tabs}>
                <TouchableOpacity
                  onPress={() => switchMode('signin')}
                  style={[styles.tab, mode === 'signin' && styles.tabActive]}
                >
                  <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                    Logga in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchMode('signup')}
                  style={[styles.tab, mode === 'signup' && styles.tabActive]}
                >
                  <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                    Skapa konto
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-postadress"
                placeholderTextColor={colors.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Lösenord"
                placeholderTextColor={colors.text3}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={canSubmit ? handleSubmit : undefined}
              />

              {mode === 'signin' && (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setKeepSignedIn(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
                    {keepSignedIn && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Håll mig inloggad</Text>
                </TouchableOpacity>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                disabled={!canSubmit}
              >
                {loading
                  ? <ActivityIndicator color="#1a0010" />
                  : <Text style={styles.submitText}>
                      {mode === 'signin' ? 'Logga in' : 'Skapa konto'}
                    </Text>
                }
              </TouchableOpacity>

              {mode === 'signin' && (
                <TouchableOpacity onPress={() => switchMode('reset')} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Glömt lösenordet?</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {appleAvailable && mode !== 'reset' && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>eller</Text>
                <View style={styles.dividerLine} />
              </View>
              {appleLoading
                ? (
                  <View style={styles.appleBtnPlaceholder}>
                    <ActivityIndicator color="#1a0010" />
                  </View>
                )
                : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={14}
                    style={styles.appleBtn}
                    onPress={handleAppleSignIn}
                  />
                )
              }
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 8,
    opacity: 0.85,
  },
  tagline: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: { backgroundColor: colors.pink },
  tabText: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display600,
  },
  tabTextActive: { color: colors.text1 },
  input: {
    backgroundColor: colors.bg2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display400,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  errorText: {
    color: colors.wrong,
    fontSize: 13,
    fontFamily: fonts.display400,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: colors.pink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lineStrong,
  },
  dividerText: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display400,
  },
  appleBtn: {
    width: '100%',
    height: 52,
  },
  appleBtnPlaceholder: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.text3,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  checkboxMark: {
    color: colors.text1,
    fontSize: 13,
    fontFamily: fonts.display700,
    lineHeight: 16,
  },
  checkboxLabel: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
  },
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  forgotText: {
    color: colors.pink,
    fontSize: 14,
    fontFamily: fonts.display500,
  },
  resetBackRow: {
    marginBottom: 20,
  },
  resetBackText: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display500,
  },
  resetTitle: {
    color: colors.text1,
    fontSize: 24,
    fontFamily: fonts.display700,
    marginBottom: 12,
  },
  resetBody: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmEmoji: { fontSize: 64, marginBottom: 24 },
  confirmTitle: {
    color: colors.text1,
    fontSize: 24,
    fontFamily: fonts.display700,
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBody: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  confirmEmail: {
    color: colors.text1,
    fontFamily: fonts.display600,
  },
  backBtn: {
    backgroundColor: colors.bg2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backText: {
    color: colors.pink,
    fontSize: 15,
    fontFamily: fonts.display600,
  },
});

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
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { isAppleAuthAvailable, signInWithApple } from '../lib/auth';
import { setUsername } from '../lib/scores';

type Mode = 'signin' | 'signup';

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
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) setError(mapError(error.message));
        // On success, App.tsx detects new session and switches to main stack
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setError(mapError(error.message));
        } else if (!data.session) {
          // Email confirmation required
          setAwaitingConfirm(true);
        }
        // If session present, App.tsx switches to main stack automatically
      }
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
        <StatusBar barStyle="light-content" backgroundColor="#12082A" />
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />
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
            <Text style={styles.logo}>Hej Bistro</Text>
            <Text style={styles.tagline}>Quiz för restaurangfolk</Text>
          </View>

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
            placeholderTextColor="#6050A0"
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
            placeholderTextColor="#6050A0"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={canSubmit ? handleSubmit : undefined}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitText}>
                  {mode === 'signin' ? 'Logga in' : 'Skapa konto'}
                </Text>
            }
          </TouchableOpacity>

          {appleAvailable && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>eller</Text>
                <View style={styles.dividerLine} />
              </View>
              {appleLoading
                ? (
                  <View style={styles.appleBtnPlaceholder}>
                    <ActivityIndicator color="#FFFFFF" />
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
  safe: { flex: 1, backgroundColor: '#12082A' },
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
    color: '#FFFFFF',
    fontSize: 38,
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1E1040',
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
  tabActive: { backgroundColor: '#9B5DE5' },
  tabText: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  tabTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3D2870',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
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
    backgroundColor: '#3D2870',
  },
  dividerText: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
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
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmEmoji: { fontSize: 64, marginBottom: 24 },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBody: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  confirmEmail: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  backBtn: {
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backText: {
    color: '#9B5DE5',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});

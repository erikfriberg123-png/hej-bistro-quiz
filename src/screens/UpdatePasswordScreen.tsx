import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../theme/tokens';

interface Props {
  onDone: () => void;
}

export default function UpdatePasswordScreen({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('Kunde inte uppdatera lösenordet. Försök igen.');
      return;
    }
    setDone(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />
      <View style={styles.container}>
        {done ? (
          <>
            <Text style={styles.emoji}>✅</Text>
            <Text style={styles.title}>Lösenord uppdaterat!</Text>
            <Text style={styles.sub}>Du kan nu logga in med ditt nya lösenord.</Text>
            <TouchableOpacity onPress={onDone} style={styles.btn}>
              <Text style={styles.btnText}>Fortsätt</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Nytt lösenord</Text>
            <Text style={styles.sub}>Ange ditt nya lösenord nedan.</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={password}
              onChangeText={v => { setPassword(v); setError(null); }}
              placeholder="Nytt lösenord"
              placeholderTextColor={colors.text3}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              onPress={handleUpdate}
              style={[styles.btn, (!password || loading) && styles.btnDisabled]}
              disabled={!password || loading}
            >
              {loading
                ? <ActivityIndicator color="#1a0010" />
                : <Text style={styles.btnText}>Spara nytt lösenord</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.s7,
    gap: spacing.s4,
  },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title: {
    color: colors.text1,
    fontSize: 26,
    fontFamily: fonts.display700,
    letterSpacing: -0.4,
  },
  sub: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display400,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display400,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  inputError: { borderColor: colors.wrong },
  error: {
    color: colors.wrong,
    fontSize: 13,
    fontFamily: fonts.display400,
  },
  btn: {
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: colors.pink,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: '#1a0010',
    fontSize: 17,
    fontFamily: fonts.display700,
  },
});

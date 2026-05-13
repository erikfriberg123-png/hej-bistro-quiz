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
      <StatusBar barStyle="light-content" backgroundColor="#030C1A" />
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
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Nytt lösenord"
              placeholderTextColor="#254A72"
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
                ? <ActivityIndicator color="#FFFFFF" />
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
  safe: { flex: 1, backgroundColor: '#030C1A' },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
  },
  sub: {
    color: '#7B9EC4',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#0C1E35',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    borderWidth: 1,
    borderColor: '#1B3A5C',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
  },
  btn: {
    backgroundColor: '#1D6FE8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
  },
});

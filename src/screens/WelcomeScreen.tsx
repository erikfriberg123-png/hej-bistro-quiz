import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { checkUsernameAvailable, setUsername } from '../lib/scores';
import { useGameStore } from '../store/gameStore';
import { AREA_BRANDING, AREAS, type Area } from '../lib/branding';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

function KrogenLogo() {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={styles.areaLogo}
      resizeMode="contain"
    />
  );
}

function VooLogo() {
  return (
    <Svg width={72} height={72} viewBox="0 0 72 72">
      <Circle cx="36" cy="36" r="34" fill="#1A0520" />
      <Circle cx="36" cy="36" r="34" fill="none" stroke="#FF38A5" strokeWidth="1.5" opacity="0.35" />
      {/* EKG glow */}
      <Path
        d="M8 38 L19 38 L23 27 L28 50 L33 16 L38 50 L43 38 L64 38"
        stroke="#FF38A5"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.15"
      />
      {/* EKG line */}
      <Path
        d="M8 38 L19 38 L23 27 L28 50 L33 16 L38 50 L43 38 L64 38"
        stroke="#FF38A5"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const loadRemoteQuestions = useGameStore(s => s.loadRemoteQuestions);

  const canSubmit = selectedArea !== null && alias.trim().length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedArea) return;
    setError('');
    setSaving(true);
    try {
      const available = await checkUsernameAvailable(alias.trim());
      if (!available) {
        setError('Det smeknamnet är redan taget. Välj ett annat.');
        return;
      }
      await setUsername(alias.trim(), selectedArea);
      loadRemoteQuestions(selectedArea);
      navigation.replace('Home');
    } catch {
      setError('Något gick fel. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0520" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.welcome}>Välkommen!</Text>
            <Text style={styles.subtitle}>Välj din bransch och ett smeknamn för att komma igång.</Text>
          </View>

          <Text style={styles.sectionLabel}>Din bransch</Text>

          {AREAS.map(area => {
            const b = AREA_BRANDING[area];
            const selected = selectedArea === area;
            return (
              <TouchableOpacity
                key={area}
                style={[
                  styles.areaCard,
                  selected && { borderColor: b.brandColor, backgroundColor: `${b.brandColor}12` },
                ]}
                onPress={() => setSelectedArea(area)}
                activeOpacity={0.8}
              >
                <View style={styles.areaLogoWrap}>
                  {area === 'krogen' ? <KrogenLogo /> : <VooLogo />}
                </View>
                <View style={styles.areaTextWrap}>
                  <Text style={[styles.areaBrandName, selected && { color: b.brandColor }]}>
                    {b.brandName}
                  </Text>
                  <Text style={styles.areaLabel}>{b.label}</Text>
                  <Text style={styles.areaTagline}>{b.tagline}</Text>
                </View>
                {selected && (
                  <View style={[styles.selectedDot, { backgroundColor: b.brandColor }]}>
                    <Text style={styles.selectedDotTick}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Ditt smeknamn</Text>
          <Text style={styles.aliasHint}>
            Visas på topplistan och när du utmanar kollegor. Välj något unikt!
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={alias}
            onChangeText={v => { setAlias(v); setError(''); }}
            placeholder="Ditt smeknamn..."
            placeholderTextColor="#6050A0"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {saving ? 'Sparar...' : 'Kom igång! →'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0520' },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 48,
  },

  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  welcome: {
    color: '#FFFFFF',
    fontSize: 34,
    fontFamily: 'DMSans_800ExtraBold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  sectionLabel: {
    color: '#B0A8C8',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1040',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3D2870',
    padding: 18,
    marginBottom: 12,
    gap: 16,
  },
  areaLogoWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  areaLogo: {
    width: 72,
    height: 72,
  },
  areaTextWrap: {
    flex: 1,
    gap: 3,
  },
  areaBrandName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'DMSans_800ExtraBold',
    letterSpacing: -0.3,
  },
  areaLabel: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  areaTagline: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 1,
  },
  selectedDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedDotTick: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },

  aliasHint: {
    color: '#6050A0',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#1E1040',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    borderWidth: 1.5,
    borderColor: '#3D2870',
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#FF5555',
  },
  errorText: {
    color: '#FF5555',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 10,
  },

  submitBtn: {
    backgroundColor: '#9B5DE5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
  },
});

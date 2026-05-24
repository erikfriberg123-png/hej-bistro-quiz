import React, { useMemo, useState } from 'react';
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
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { checkUsernameAvailable, setUsername } from '../lib/scores';
import { useGameStore } from '../store/gameStore';
import { AREA_BRANDING, AREAS, type Area } from '../lib/branding';
import { fonts, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

function KrogenLogo() {
  return (
    <Svg width={72} height={72} viewBox="0 0 1024 1024">
      <Circle cx="512" cy="512" r="490" fill="#1A0520" />
      <Circle cx="512" cy="512" r="490" fill="none" stroke="#9B5DE5" strokeWidth="6" opacity={0.35} />
      <Path d="M 188 168 L 512 582 L 836 168" fill="none" stroke="#9B5DE5" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="512" y1="582" x2="512" y2="764" stroke="#9B5DE5" strokeWidth="28" strokeLinecap="round" />
      <Line x1="376" y1="764" x2="648" y2="764" stroke="#9B5DE5" strokeWidth="28" strokeLinecap="round" />
      <Circle cx="512" cy="548" r="24" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

function VooLogo() {
  return (
    <Image
      source={require('../../assets/health-icon-1-stethoscope.png')}
      style={{ width: 72, height: 72 }}
      resizeMode="contain"
    />
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg1} />
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
            const disabled = !!b.disabled;
            return (
              <TouchableOpacity
                key={area}
                style={[
                  styles.areaCard,
                  selected && { borderColor: b.brandColor, backgroundColor: `${b.brandColor}12` },
                  disabled && { opacity: 0.45 },
                ]}
                onPress={() => !disabled && setSelectedArea(area)}
                activeOpacity={disabled ? 1 : 0.8}
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
                {disabled ? (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Snart</Text>
                  </View>
                ) : selected ? (
                  <View style={[styles.selectedDot, { backgroundColor: b.brandColor }]}>
                    <Text style={styles.selectedDotTick}>✓</Text>
                  </View>
                ) : null}
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
            placeholderTextColor={colors.text3}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              selectedArea && { backgroundColor: AREA_BRANDING[selectedArea].brandColor },
              !canSubmit && styles.submitBtnDisabled,
            ]}
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

const makeStyles = (colors: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg1 },
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
    color: colors.text1,
    fontSize: 34,
    fontFamily: fonts.display700,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  sectionLabel: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: fonts.display600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
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
  areaTextWrap: {
    flex: 1,
    gap: 3,
  },
  areaBrandName: {
    color: colors.text1,
    fontSize: 22,
    fontFamily: fonts.display700,
    letterSpacing: -0.3,
  },
  areaLabel: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display600,
  },
  areaTagline: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.display400,
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
    color: colors.text1,
    fontSize: 14,
    fontFamily: fonts.display700,
  },
  comingSoonBadge: {
    backgroundColor: colors.lineStrong,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  comingSoonText: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: fonts.display600,
    letterSpacing: 0.5,
  },

  aliasHint: {
    color: colors.text3,
    fontSize: 13,
    fontFamily: fonts.display400,
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: colors.text1,
    fontSize: 16,
    fontFamily: fonts.display500,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    marginBottom: 6,
  },
  inputError: {
    borderColor: colors.wrong,
  },
  errorText: {
    color: colors.wrong,
    fontSize: 13,
    fontFamily: fonts.display500,
    marginBottom: 10,
  },

  submitBtn: {
    backgroundColor: colors.pink,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
  },
});

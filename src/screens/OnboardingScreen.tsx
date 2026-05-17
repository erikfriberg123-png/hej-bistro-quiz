import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { colors, fonts, radius, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const PAGES = [
  {
    emoji: '🍽️',
    neon: '~ välkommen ~',
    title: 'Välkommen till\nQuizine!',
    body: 'Det roligaste sättet att lära sig mer om mat, dryck och restaurangbranschen.',
    accent: colors.pink,
    glow: colors.pinkGlow,
  },
  {
    emoji: '🏆',
    neon: '~ samla XP ~',
    title: 'Tävla med\ndina kollegor',
    body: 'Samla XP, bygg din streak och klättra på topplistan. Spela varje dag för att hålla igång!',
    accent: colors.yellow,
    glow: colors.yellowGlow,
  },
  {
    emoji: '👥',
    neon: '~ hitta varandra ~',
    title: 'Lägg till\nvänner',
    body: 'Gå till Vänner-fliken och sök på en kollegas användarnamn. Skicka en vänförfrågan — när de accepterar kan ni se varandras resultat och utmana varandra.',
    accent: colors.cyan,
    glow: colors.cyanGlow,
  },
  {
    emoji: '⚔️',
    neon: '~ vem är bäst? ~',
    title: 'Battle-läget',
    body: 'Utmana en vän på ett ämne du väljer. Ni spelar var för sig och svarar på samma frågor — vinnaren är den med flest poäng när båda är klara.',
    accent: colors.cyan,
    glow: colors.cyanGlow,
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('onboarding-done', '1');
    navigation.replace('Auth');
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setPage(p => p + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg0} />

      {/* Ambient glow blob — changes with accent */}
      <View
        pointerEvents="none"
        style={[styles.glowBlob, { backgroundColor: current.glow }]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageCounter}>
          {String(page + 1).padStart(2, '0')} / {String(PAGES.length).padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={finish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Hoppa över</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.neonLabel, { color: current.accent }]}>{current.neon}</Text>

        <View style={[
          styles.emojiRing,
          { borderColor: current.accent, shadowColor: current.accent },
        ]}>
          <Text style={styles.emoji}>{current.emoji}</Text>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === page && {
                backgroundColor: current.accent,
                width: 24,
                shadowColor: current.accent,
                shadowOpacity: 0.7,
                shadowRadius: 6,
                elevation: 4,
              },
            ]}
          />
        ))}
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextText}>{isLast ? 'Kom igång!' : 'Nästa  →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg0 },

  glowBlob: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
  },
  pageCounter: {
    fontFamily: fonts.mono700,
    fontSize: 11,
    color: colors.text4,
    letterSpacing: 0.22 * 11,
  },
  skipText: {
    color: colors.text3,
    fontSize: 13,
    fontFamily: fonts.display500,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s7,
  },
  neonLabel: {
    fontFamily: fonts.neon700,
    fontSize: 20,
    marginBottom: 28,
    letterSpacing: 0.02 * 20,
  },
  emojiRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 8,
  },
  emoji: {
    fontSize: 46,
  },
  title: {
    color: colors.text1,
    fontSize: 30,
    fontFamily: fonts.display700,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  body: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display400,
    textAlign: 'center',
    lineHeight: 25,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bg3,
  },

  footer: {
    paddingHorizontal: spacing.s5,
    paddingBottom: 36,
  },
  nextBtn: {
    backgroundColor: colors.pink,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.pink,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  nextText: {
    color: '#1a0010',
    fontSize: 17,
    fontFamily: fonts.display700,
    letterSpacing: -0.2,
  },
});

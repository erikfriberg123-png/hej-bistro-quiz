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

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const PAGES = [
  {
    emoji: '🍽️',
    title: 'Välkommen till\nQuizine!',
    body: 'Det roligaste sättet att lära sig mer om mat, dryck och restaurangbranschen.',
    accent: '#FF6B35',
  },
  {
    emoji: '🏆',
    title: 'Tävla med\ndina kollegor',
    body: 'Samla XP, bygg din streak och klättra på topplistan. Spela varje dag för att hålla igång!',
    accent: '#F7C948',
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
      <StatusBar barStyle="light-content" backgroundColor="#12082A" />

      <TouchableOpacity onPress={finish} style={styles.skipBtn}>
        <Text style={styles.skipText}>Hoppa över</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === page && { backgroundColor: current.accent, width: 24 },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={next}
          style={[styles.nextBtn, { backgroundColor: current.accent }]}
        >
          <Text style={styles.nextText}>{isLast ? 'Kom igång!' : 'Nästa'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12082A' },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  skipText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 88,
    marginBottom: 36,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 20,
  },
  body: {
    color: '#B0A8C8',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D2870',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
  },
});

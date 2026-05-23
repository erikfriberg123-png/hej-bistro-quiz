import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  LayoutChangeEvent,
  Dimensions,
  Platform,
  Image,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import { fonts, radius, spacing } from '../theme/tokens'
import { useTheme } from '../theme/ThemeContext';
import type { Colors } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type AccentKey = 'pink' | 'yellow' | 'cyan' | 'wrong';

const PAGE_DEFS = [
  {
    image: require('../../assets/logo.png') as number,
    emoji: null,
    neon: '~ välkommen ~',
    title: 'Välkommen till\nQuizine!',
    body: 'Det roligaste sättet att lära sig mer om mat, dryck och restaurangbranschen.',
    accentKey: 'pink' as AccentKey,
  },
  {
    image: null,
    emoji: '🏆',
    neon: '~ samla XP ~',
    title: 'Tävla med\ndina kollegor',
    body: 'Samla XP och klättra på topplistan. Tävla mot dina kollegor och se vem som kan mest!',
    accentKey: 'yellow' as AccentKey,
  },
  {
    image: null,
    emoji: '👥',
    neon: '~ hitta varandra ~',
    title: 'Lägg till\nvänner',
    body: 'Gå till Vänner-fliken och sök på en kollegas användarnamn. Skicka en vänförfrågan — när de accepterar kan ni se varandras resultat och utmana varandra.',
    accentKey: 'cyan' as AccentKey,
  },
  {
    image: null,
    emoji: '⚔️',
    neon: '~ vem är bäst? ~',
    title: 'Battle-läget',
    body: 'Utmana en vän på ett ämne du väljer. Ni spelar var för sig och svarar på samma frågor — vinnaren är den med flest poäng när båda är klara.',
    accentKey: 'wrong' as AccentKey,
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const colors = useTheme();
  const [listWidth, setListWidth] = useState(Dimensions.get('window').width);
  const styles = useMemo(() => makeStyles(colors, listWidth), [colors, listWidth]);
  const [page, setPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setListWidth(w);
  }, []);

  const def = PAGE_DEFS[page];
  const accent = colors[def.accentKey];
  const glowKey = def.accentKey === 'wrong' ? 'wrongGlow' : `${def.accentKey}Glow`;
  const glow = colors[glowKey as keyof Colors] as string;
  const isLast = page === PAGE_DEFS.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('onboarding-done', '1');
    navigation.replace('Auth');
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      const nextPage = page + 1;
      setPage(nextPage);
      flatListRef.current?.scrollToIndex({ index: nextPage, animated: true });
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setPage(viewableItems[0].index);
    }
  }, []);

  const renderPage = ({ item }: { item: typeof PAGE_DEFS[0] }) => {
    const pageAccent = colors[item.accentKey];
    return (
      <View style={styles.content}>
        <Text style={[styles.neonLabel, { color: pageAccent }]}>{item.neon}</Text>
        <View style={[styles.emojiRing, { borderColor: pageAccent, shadowColor: pageAccent }]}>
          {item.image ? (
            <Image source={item.image} style={styles.ringImage} resizeMode="contain" />
          ) : (
            <Text style={styles.emoji}>{item.emoji}</Text>
          )}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg0} />

      <View pointerEvents="none" style={[styles.glowBlob, { backgroundColor: glow }]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageCounter}>
          {String(page + 1).padStart(2, '0')} / {String(PAGE_DEFS.length).padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={finish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Hoppa över</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable pages — native uses FlatList; web renders the active card directly */}
      {Platform.OS === 'web' ? (
        <View style={styles.flatList} onLayout={onListLayout}>
          {renderPage({ item: PAGE_DEFS[page] })}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={PAGE_DEFS}
          renderItem={renderPage}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          style={styles.flatList}
          onLayout={onListLayout}
        />
      )}

      {/* Progress dots */}
      <View style={styles.dots}>
        {PAGE_DEFS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === page && {
                backgroundColor: accent,
                width: 24,
                shadowColor: accent,
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
        <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: accent, shadowColor: accent }]} activeOpacity={0.85}>
          <Text style={styles.nextText}>{isLast ? 'Kom igång!' : 'Nästa  →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors, listWidth: number) => StyleSheet.create({
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

  flatList: {
    flex: 1,
  },
  content: {
    width: listWidth,
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
    fontSize: 54,
  },
  ringImage: {
    width: 72,
    height: 72,
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
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
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

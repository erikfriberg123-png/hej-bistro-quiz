import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Difficulty } from '../types';

const { width: W, height: H } = Dimensions.get('window');

type StarCfg = {
  startX: number; startY: number;
  endX: number;   endY: number;
  size: number;   delay: number;
  duration: number; rotation: number;
};

const STARS: StarCfg[] = [
  { startX: 0.04 * W, startY: 0.76 * H, endX: 0.93 * W, endY: 0.08 * H, size: 50, delay: 0,   duration: 520, rotation:  190 },
  { startX: 0.89 * W, startY: 0.70 * H, endX: 0.05 * W, endY: 0.10 * H, size: 42, delay: 65,  duration: 490, rotation: -165 },
  { startX: 0.18 * W, startY: H + 12,   endX: 0.82 * W, endY: 0.06 * H, size: 58, delay: 32,  duration: 555, rotation:  210 },
  { startX: 0.72 * W, startY: H + 12,   endX: 0.07 * W, endY: 0.07 * H, size: 46, delay: 105, duration: 500, rotation: -185 },
];

function FlyingStar({ cfg }: { cfg: StarCfg }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      cfg.delay,
      withTiming(1, { duration: cfg.duration, easing: Easing.in(Easing.quad) }),
    );
    return () => cancelAnimation(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.07, 0.82, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [cfg.startX, cfg.endX]) },
      { translateY: interpolate(t.value, [0, 1], [cfg.startY, cfg.endY]) },
      { rotate: `${interpolate(t.value, [0, 1], [0, cfg.rotation])}deg` },
      { scale: interpolate(t.value, [0, 0.08, 0.88, 1], [0.3, 1.5, 1.1, 0.4]) },
    ],
  }));

  return <Animated.Text style={[styles.star, { fontSize: cfg.size }, style]}>⭐</Animated.Text>;
}

function WowText() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.4, { duration: 185, easing: Easing.out(Easing.back(2.5)) }),
      withTiming(1.0, { duration: 95,  easing: Easing.inOut(Easing.ease) }),
      withDelay(580, withTiming(0.6, { duration: 270, easing: Easing.in(Easing.quad) })),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(760, withTiming(0, { duration: 270 })),
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wowContainer} pointerEvents="none">
      <Animated.Text style={[styles.wowText, animStyle]}>WOW!!!!</Animated.Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  showStars: boolean;
  difficulty: Difficulty | null;
}

export function CorrectAnswerEffects({ visible, showStars, difficulty }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {showStars && STARS.map((cfg, i) => <FlyingStar key={i} cfg={cfg} />)}
      {difficulty === 'hard' && <WowText />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wowText: {
    fontSize: 82,
    fontFamily: 'DMSans_700Bold',
    color: '#FFE66D',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 12,
    letterSpacing: 2,
  },
});

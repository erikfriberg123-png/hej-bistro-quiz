import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
// Clamp to 480 (app max-width) so effects stay inside the visible column on wide screens
const EW = Math.min(W, 480);
const OX = (W - EW) / 2;

export type EffectType = 'slowStars' | 'bigBalloons' | 'fireworks' | 'champagne';

// ── Slow Stars ──────────────────────────────────────────────────────────────

const SLOW_STARS = [
  { startX: OX + EW * 0.05, startY: H * 0.88,  endX: OX + EW * 0.92, endY: H * 0.05, size: 66, delay: 0,   dur: 2200, rot:  180 },
  { startX: OX + EW * 0.90, startY: H * 0.82,  endX: OX + EW * 0.08, endY: H * 0.07, size: 56, delay: 280, dur: 2500, rot: -155 },
  { startX: OX + EW * 0.18, startY: H + 20,    endX: OX + EW * 0.82, endY: H * 0.08, size: 72, delay: 140, dur: 2000, rot:  205 },
  { startX: OX + EW * 0.75, startY: H + 20,    endX: OX + EW * 0.10, endY: H * 0.09, size: 50, delay: 430, dur: 2600, rot: -180 },
  { startX: OX + EW * 0.48, startY: H * 0.94,  endX: OX + EW * 0.52, endY: H * 0.02, size: 62, delay: 90,  dur: 2300, rot:  145 },
] as const;

function SlowStar({ cfg }: { cfg: typeof SLOW_STARS[number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(cfg.delay, withTiming(1, { duration: cfg.dur, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.06, 0.86, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [cfg.startX, cfg.endX]) },
      { translateY: interpolate(t.value, [0, 1], [cfg.startY, cfg.endY]) },
      { rotate: `${interpolate(t.value, [0, 1], [0, cfg.rot])}deg` },
      { scale: interpolate(t.value, [0, 0.07, 0.88, 1], [0.4, 1.3, 1.1, 0.5]) },
    ],
  }));
  return <Animated.Text style={[styles.absPos, { fontSize: cfg.size }, style]}>⭐</Animated.Text>;
}

// ── Big Balloons ─────────────────────────────────────────────────────────────

const BIG_BALLOONS = [
  { x: 0.06, dl: 80,  dr: 4200, sway: 18,  size: 72, emoji: '🎈' },
  { x: 0.22, dl: 420, dr: 4600, sway: -22, size: 80, emoji: '🎉' },
  { x: 0.38, dl: 0,   dr: 3900, sway: 15,  size: 68, emoji: '🎈' },
  { x: 0.54, dl: 260, dr: 4400, sway: -18, size: 76, emoji: '🎊' },
  { x: 0.70, dl: 560, dr: 4100, sway: 20,  size: 72, emoji: '🎈' },
  { x: 0.85, dl: 160, dr: 4500, sway: -16, size: 80, emoji: '🎉' },
  { x: 0.30, dl: 720, dr: 4300, sway: 24,  size: 64, emoji: '🎊' },
  { x: 0.62, dl: 340, dr: 3800, sway: -20, size: 70, emoji: '🎈' },
] as const;

function BigBalloon({ cfg }: { cfg: typeof BIG_BALLOONS[number] }) {
  const rise = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(cfg.dl, withTiming(1, { duration: cfg.dr, easing: Easing.out(Easing.quad) }));
    sway.value = withDelay(
      cfg.dl,
      withRepeat(
        withSequence(
          withTiming(1,  { duration: 820, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 820, easing: Easing.inOut(Easing.ease) }),
        ),
        8, true,
      ),
    );
    return () => { cancelAnimation(rise); cancelAnimation(sway); };
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(rise.value, [0, 0.06, 0.88, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: OX + cfg.x * EW + sway.value * cfg.sway },
      { translateY: interpolate(rise.value, [0, 1], [H + 90, -110]) },
    ],
  }));
  return <Animated.Text style={[styles.absPos, { fontSize: cfg.size }, style]}>{cfg.emoji}</Animated.Text>;
}

// ── Fireworks ────────────────────────────────────────────────────────────────

const FW_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#A29BFE',
  '#FF9F43', '#96E6A1', '#F8A5C2', '#45AAF2',
  '#FC5C65', '#FD9644', '#FFDD59', '#26de81',
  '#2bcbba', '#a55eea', '#FF6B35', '#f7b731',
];

function makeParticles(count: number, offset: number) {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + offset,
    dist: 82 + (i % 4) * 24,
    color: FW_COLORS[i % FW_COLORS.length],
  }));
}

const FIREWORKS_CFG = [
  { cx: OX + EW * 0.20, cy: H * 0.24, delay: 0,    dur: 960,  particles: makeParticles(16, 0) },
  { cx: OX + EW * 0.80, cy: H * 0.20, delay: 380,  dur: 1010, particles: makeParticles(16, 0.2) },
  { cx: OX + EW * 0.50, cy: H * 0.32, delay: 760,  dur: 1060, particles: makeParticles(14, 0.4) },
  { cx: OX + EW * 0.32, cy: H * 0.46, delay: 1180, dur: 920,  particles: makeParticles(12, 0.7) },
] as const;

function FwFlash({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(t.value, [0, 0.12, 1], [0, 1.2, 3.8]) }],
  }));
  return <Animated.View style={[styles.fwFlash, style]} />;
}

function FwParticle({ angle, dist, color, delay, dur }: {
  angle: number; dist: number; color: string; delay: number; dur: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.65, 1], [0, 1, 0.7, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, Math.cos(angle) * dist]) },
      { translateY: interpolate(t.value, [0, 1], [0, Math.sin(angle) * dist]) },
      { scale: interpolate(t.value, [0, 0.1, 1], [0, 2.4, 0.5]) },
    ],
  }));
  return <Animated.View style={[styles.fwParticle, { backgroundColor: color }, style]} />;
}

// ── Champagne ────────────────────────────────────────────────────────────────

const SPRAY_EMOJIS = ['🥂', '✨', '💫', '⭐', '🎉', '✨', '💫', '🌟'];

// Left bottle: fan upward and to the right; Right bottle: mirrored
const SPRAY_ANGLES_LEFT  = [-125, -105, -90, -70, -50, -115, -95, -75];
const SPRAY_ANGLES_RIGHT = [-55,  -75,  -90, -110, -130, -65, -85, -105];

function SprayParticle({ anchorX, anchorY, angle, dist, delay, emoji }: {
  anchorX: number; anchorY: number; angle: number; dist: number; delay: number; emoji: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1150, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.07, 0.72, 1], [0, 1, 0.85, 0]),
    transform: [
      { translateX: anchorX + interpolate(t.value, [0, 1], [0, Math.cos(angle) * dist]) },
      { translateY: anchorY + interpolate(t.value, [0, 1], [0, Math.sin(angle) * dist]) },
      { scale: interpolate(t.value, [0, 0.12, 1], [0.3, 1.5, 0.6]) },
    ],
  }));
  return <Animated.Text style={[styles.absPos, { fontSize: 22 }, style]}>{emoji}</Animated.Text>;
}

function ChampagneBottle({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  const finalX = isLeft ? OX + EW * 0.08 : OX + EW * 0.80;
  const finalY = H * 0.44;
  const tilt   = isLeft ? 28 : -28;

  const rise   = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    rise.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.back(1.2)) });
    wobble.value = withDelay(
      760,
      withRepeat(
        withSequence(
          withTiming(1,  { duration: 220, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        ),
        6, true,
      ),
    );
    return () => { cancelAnimation(rise); cancelAnimation(wobble); };
  }, []);

  const bottleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rise.value, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(rise.value, [0, 1], [isLeft ? OX - 100 : OX + EW + 100, finalX]) },
      { translateY: interpolate(rise.value, [0, 1], [H + 90, finalY]) + wobble.value * 5 },
      { rotate: `${tilt + wobble.value * 6}deg` },
    ],
  }));

  // Spray anchor: tip of the bottle (top-center of the emoji at its final position)
  const sprayX = isLeft ? finalX + 46 : finalX + 16;
  const sprayY = finalY + 4;
  const angles = isLeft ? SPRAY_ANGLES_LEFT : SPRAY_ANGLES_RIGHT;

  return (
    <>
      <Animated.Text style={[styles.absPos, { fontSize: 70 }, bottleStyle]}>🍾</Animated.Text>
      {angles.map((deg, i) => (
        <SprayParticle
          key={i}
          anchorX={sprayX}
          anchorY={sprayY}
          angle={(deg * Math.PI) / 180}
          dist={68 + i * 14}
          delay={800 + i * 55}
          emoji={SPRAY_EMOJIS[i % SPRAY_EMOJIS.length]}
        />
      ))}
    </>
  );
}

// ── Wow Text ─────────────────────────────────────────────────────────────────

function WowText() {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.4, { duration: 185, easing: Easing.out(Easing.back(2.5)) }),
      withTiming(1.0, { duration: 95 }),
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

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  effects: EffectType[];
  showWow?: boolean;
}

export function CelebrationOverlay({ effects, showWow }: Props) {
  if (effects.length === 0 && !showWow) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {effects.includes('slowStars') && SLOW_STARS.map((cfg, i) => (
        <SlowStar key={`ss${i}`} cfg={cfg} />
      ))}
      {effects.includes('bigBalloons') && BIG_BALLOONS.map((cfg, i) => (
        <BigBalloon key={`bb${i}`} cfg={cfg} />
      ))}
      {effects.includes('fireworks') && FIREWORKS_CFG.map((fw, fi) => (
        <View key={`fw${fi}`} style={[styles.burstAnchor, { left: fw.cx, top: fw.cy }]}>
          <FwFlash delay={fw.delay} />
          {fw.particles.map((p, pi) => (
            <FwParticle key={pi} angle={p.angle} dist={p.dist} color={p.color} delay={fw.delay} dur={fw.dur} />
          ))}
        </View>
      ))}
      {effects.includes('champagne') && (
        <>
          <ChampagneBottle side="left" />
          <ChampagneBottle side="right" />
        </>
      )}
      {showWow && <WowText />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  absPos: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  burstAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fwFlash: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  fwParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wowContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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

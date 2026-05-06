import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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

// ── Confetti ──────────────────────────────────────────────────────────────
const CONFETTI = [
  { x: 0.04, dl: 0,   dr: 3200, rot:  380, dft:  22, color: '#FF6B6B', cw: 10, ch:  6 },
  { x: 0.13, dl: 160, dr: 2900, rot: -290, dft: -18, color: '#FFE66D', cw:  7, ch: 14 },
  { x: 0.21, dl: 80,  dr: 3400, rot:  260, dft:  16, color: '#4ECDC4', cw:  9, ch:  5 },
  { x: 0.32, dl: 340, dr: 2800, rot: -340, dft: -22, color: '#A29BFE', cw: 11, ch:  7 },
  { x: 0.43, dl: 50,  dr: 3600, rot:  430, dft:  26, color: '#FF9F43', cw:  8, ch: 12 },
  { x: 0.54, dl: 230, dr: 3100, rot: -220, dft: -14, color: '#96E6A1', cw: 10, ch:  5 },
  { x: 0.65, dl: 410, dr: 2700, rot:  310, dft:  20, color: '#FF6B6B', cw:  7, ch:  9 },
  { x: 0.76, dl: 140, dr: 3300, rot: -400, dft: -24, color: '#FFE66D', cw:  9, ch:  6 },
  { x: 0.87, dl: 290, dr: 3500, rot:  260, dft:  18, color: '#DDA0DD', cw: 11, ch:  5 },
  { x: 0.96, dl: 90,  dr: 2900, rot: -280, dft: -12, color: '#4ECDC4', cw:  8, ch: 11 },
  // second wave
  { x: 0.08, dl: 580, dr: 3100, rot:  340, dft:  16, color: '#A29BFE', cw:  9, ch:  6 },
  { x: 0.19, dl: 680, dr: 2900, rot: -430, dft: -18, color: '#FF9F43', cw:  7, ch: 13 },
  { x: 0.29, dl: 790, dr: 3300, rot:  280, dft:  24, color: '#96E6A1', cw: 10, ch:  5 },
  { x: 0.40, dl: 640, dr: 3600, rot: -260, dft: -16, color: '#FF6B6B', cw:  8, ch:  8 },
  { x: 0.51, dl: 740, dr: 2900, rot:  400, dft:  20, color: '#FFE66D', cw: 11, ch:  6 },
  { x: 0.62, dl: 840, dr: 3200, rot: -310, dft: -20, color: '#DDA0DD', cw:  9, ch:  5 },
  { x: 0.73, dl: 690, dr: 3400, rot:  220, dft:  26, color: '#4ECDC4', cw:  7, ch: 10 },
  { x: 0.84, dl: 890, dr: 2800, rot: -340, dft: -18, color: '#A29BFE', cw: 10, ch:  6 },
] as const;

// ── Balloons ───────────────────────────────────────────────────────────────
const BALLOONS = [
  { x: 0.10, dl: 200, dr: 3900, sway: 14 },
  { x: 0.28, dl: 480, dr: 4300, sway: -18 },
  { x: 0.50, dl: 100, dr: 3700, sway: 16 },
  { x: 0.70, dl: 380, dr: 4100, sway: -14 },
  { x: 0.88, dl: 260, dr: 3500, sway: 20 },
] as const;

// ── Fireworks ──────────────────────────────────────────────────────────────
const FW_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#A29BFE',
  '#FF9F43', '#96E6A1', '#DDA0DD', '#F8A5C2',
  '#FC5C65', '#45AAF2',
];

function makeParticles(offset: number) {
  return Array.from({ length: 10 }, (_, i) => ({
    angle: (i / 10) * Math.PI * 2 + offset,
    dist: 48 + (i % 3) * 18,
    color: FW_COLORS[i],
  }));
}

const FIREWORKS = [
  { cx: 0.22, cy: 0.28, delay: 0,   particles: makeParticles(0) },
  { cx: 0.78, cy: 0.22, delay: 380, particles: makeParticles(0.31) },
  { cx: 0.50, cy: 0.35, delay: 800, particles: makeParticles(0.63) },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function ConfettiPiece({ cfg }: { cfg: typeof CONFETTI[number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(cfg.dl, withTiming(1, { duration: cfg.dr, easing: Easing.in(Easing.quad) }));
    return () => cancelAnimation(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.75, 1], [1, 1, 0]),
    transform: [
      { translateX: cfg.x * W + interpolate(t.value, [0, 1], [0, cfg.dft]) },
      { translateY: interpolate(t.value, [0, 1], [-20, H + 20]) },
      { rotate: `${interpolate(t.value, [0, 1], [0, cfg.rot])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { width: cfg.cw, height: cfg.ch, backgroundColor: cfg.color },
        style,
      ]}
    />
  );
}

function FloatingBalloon({ cfg }: { cfg: typeof BALLOONS[number] }) {
  const rise = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(cfg.dl, withTiming(1, { duration: cfg.dr, easing: Easing.out(Easing.quad) }));
    sway.value = withDelay(
      cfg.dl,
      withRepeat(
        withSequence(
          withTiming(1,  { duration: 650, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        ),
        6,
        true,
      ),
    );
    return () => { cancelAnimation(rise); cancelAnimation(sway); };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(rise.value, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: cfg.x * W + sway.value * cfg.sway },
      { translateY: interpolate(rise.value, [0, 1], [H + 60, -80]) },
    ],
  }));

  return <Animated.Text style={[styles.balloon, style]}>🎈</Animated.Text>;
}

function FireworkParticle({
  angle, dist, color, delay,
}: { angle: number; dist: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.7, 1], [0, 1, 0.6, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, Math.cos(angle) * dist]) },
      { translateY: interpolate(t.value, [0, 1], [0, Math.sin(angle) * dist]) },
      { scale: interpolate(t.value, [0, 0.15, 1], [0, 1.8, 0.4]) },
    ],
  }));

  return <Animated.View style={[styles.fwParticle, { backgroundColor: color }, style]} />;
}

// ── Public component ───────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

export function CelebrationOverlay({ visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {CONFETTI.map((cfg, i) => (
        <ConfettiPiece key={`c${i}`} cfg={cfg} />
      ))}
      {BALLOONS.map((cfg, i) => (
        <FloatingBalloon key={`b${i}`} cfg={cfg} />
      ))}
      {FIREWORKS.map((fw, fi) =>
        fw.particles.map((p, pi) => (
          <View
            key={`f${fi}p${pi}`}
            style={[styles.burstAnchor, { left: fw.cx * W, top: fw.cy * H }]}
          >
            <FireworkParticle
              angle={p.angle}
              dist={p.dist}
              color={p.color}
              delay={fw.delay}
            />
          </View>
        )),
      )}
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
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
  balloon: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: 34,
  },
  burstAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fwParticle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const TIMER_WIDTH = 40;
const TRACK_W = 10;
const TIP_SIZE = 22;
const GLOW_SIZE = 42;
const TRACK_LEFT = (TIMER_WIDTH - TRACK_W) / 2;
const TIP_LEFT = (TIMER_WIDTH - TIP_SIZE) / 2;

// Sparks fly sideways and upward from the burning tip
const SPARKS = [
  { angle:  0,                dist: 22, delay: 0,   dur: 420 },
  { angle: -Math.PI * 0.15,   dist: 18, delay: 60,  dur: 380 },
  { angle: -Math.PI * 0.20,   dist: 20, delay: 140, dur: 400 },
  { angle:  Math.PI,          dist: 20, delay: 30,  dur: 440 },
  { angle: -Math.PI * 0.75,   dist: 18, delay: 110, dur: 380 },
  { angle: -Math.PI * 0.85,   dist: 16, delay: 190, dur: 420 },
  { angle: -Math.PI * 0.50,   dist: 20, delay: 200, dur: 460 },
  { angle: -Math.PI * 0.35,   dist: 16, delay: 280, dur: 400 },
  { angle: -Math.PI * 0.65,   dist: 18, delay: 80,  dur: 420 },
] as const;

function Spark({
  angle, dist, delay, dur, isRunning,
}: {
  angle: number; dist: number; delay: number; dur: number; isRunning: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      t.value = 0;
      t.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1 }),
        ),
        -1, false,
      ));
    } else {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 150 });
    }
  }, [isRunning]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.65, 1], [0, 1, 0.5, 0]),
    transform: [
      { translateX: t.value * Math.cos(angle) * dist },
      { translateY: t.value * Math.sin(angle) * dist },
      { scale: interpolate(t.value, [0, 0.1, 1], [0, 1.6, 0.2]) },
    ],
  }));

  return <Animated.View style={[styles.spark, style]} />;
}

interface Props {
  duration: number;
  onExpire: () => void;
  isRunning: boolean;
}

function colorForSeconds(s: number): string {
  if (s <= 3) return colors.wrong;
  if (s <= 7) return '#FF9F43';
  return colors.yellow;
}

export function SparklerTimer({ duration, onExpire, isRunning }: Props) {
  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);
  const trackHeightSV = useSharedValue(400);
  const totalSeconds = Math.floor(duration / 1000);

  const [displaySeconds, setDisplaySeconds] = useState(totalSeconds);
  const [color, setColor] = useState(colorForSeconds(totalSeconds));

  const updateDisplay = (raw: number) => {
    const s = Math.max(0, raw);
    setDisplaySeconds(s);
    setColor(colorForSeconds(s));
  };

  useAnimatedReaction(
    () => Math.ceil(progress.value * totalSeconds),
    (current, previous) => {
      if (current !== previous) runOnJS(updateDisplay)(current);
    },
  );

  useEffect(() => {
    if (isRunning) {
      cancelAnimation(pulse);
      pulse.value = 1;
      progress.value = 1;
      setDisplaySeconds(totalSeconds);
      setColor(colorForSeconds(totalSeconds));
      progress.value = withTiming(0, { duration, easing: Easing.linear }, finished => {
        if (finished) runOnJS(onExpire)();
      });
    } else {
      cancelAnimation(progress);
    }
  }, [isRunning]);

  useEffect(() => {
    if (displaySeconds <= 3 && displaySeconds > 0 && isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 130 }),
          withTiming(1.0, { duration: 130 }),
        ),
        -1, true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 80 });
    }
  }, [displaySeconds, isRunning]);

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackHeightSV.value = e.nativeEvent.layout.height;
  }, []);

  // Fill bar sits at the bottom, height shrinks as time runs out (tip descends)
  const fillStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      progress.value,
      [0, 0.2, 0.467, 1],
      [colors.wrong, '#FF9F43', colors.yellow, '#FFE878'],
    );
    return {
      height: Math.max(0, progress.value) * trackHeightSV.value,
      backgroundColor: bg,
    };
  });

  // Tip sits at the top of the fill bar and descends as time runs out
  const tipStyle = useAnimatedStyle(() => {
    const y = (1 - Math.max(0, progress.value)) * trackHeightSV.value - TIP_SIZE / 2;
    return { transform: [{ translateY: Math.max(-TIP_SIZE / 2, y) }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      progress.value,
      [0, 0.2, 0.467, 1],
      [colors.wrongGlow, 'rgba(255,159,67,0.45)', colors.yellowGlow, 'rgba(255,232,120,0.45)'],
    );
    return { backgroundColor: bg };
  });

  const tipDotStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      progress.value,
      [0, 0.2, 0.467, 1],
      [colors.wrong, '#FF9F43', colors.yellow, '#FFFFFF'],
    );
    return { backgroundColor: bg };
  });

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.outer, wrapperStyle]}>
      <Text style={[styles.seconds, { color }]}>{displaySeconds}</Text>

      <View style={styles.trackArea} onLayout={handleTrackLayout}>
        {/* Background track */}
        <View style={[styles.track, { left: TRACK_LEFT }]} />

        {/* Animated fill — anchored to bottom, shrinks upward */}
        <Animated.View style={[styles.fill, { left: TRACK_LEFT }, fillStyle]} />

        {/* Burning tip + sparks — descends as time runs out */}
        <Animated.View style={[styles.tipWrapper, { left: TIP_LEFT }, tipStyle]}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.tipDot, tipDotStyle]} />
          {SPARKS.map((s, i) => (
            <Spark key={i} angle={s.angle} dist={s.dist} delay={s.delay} dur={s.dur} isRunning={isRunning} />
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: TIMER_WIDTH,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  seconds: {
    fontSize: 18,
    fontFamily: fonts.mono700,
    marginBottom: 10,
  },
  trackArea: {
    flex: 1,
    width: TIMER_WIDTH,
  },
  track: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TRACK_W,
    backgroundColor: colors.bg3,
    borderRadius: TRACK_W / 2,
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    width: TRACK_W,
    borderRadius: TRACK_W / 2,
  },
  tipWrapper: {
    position: 'absolute',
    top: 0,
    width: TIP_SIZE,
    height: TIP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    left: (TIP_SIZE - GLOW_SIZE) / 2,
    top: (TIP_SIZE - GLOW_SIZE) / 2,
  },
  tipDot: {
    width: TIP_SIZE,
    height: TIP_SIZE,
    borderRadius: TIP_SIZE / 2,
  },
  spark: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFE878',
  },
});

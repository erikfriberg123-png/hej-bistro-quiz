import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 120;
const RADIUS = 50;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  duration: number;
  onExpire: () => void;
  isRunning: boolean;
}

function colorForSeconds(s: number): string {
  if (s <= 3) return '#F44336';
  if (s <= 7) return '#F7C948';
  return '#4CAF50';
}

export function SparklerTimer({ duration, onExpire, isRunning }: Props) {
  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);
  const [displaySeconds, setDisplaySeconds] = useState(Math.floor(duration / 1000));
  const [color, setColor] = useState('#4CAF50');

  const updateDisplay = (raw: number) => {
    const s = Math.max(0, raw);
    setDisplaySeconds(s);
    setColor(colorForSeconds(s));
  };

  useAnimatedReaction(
    () => Math.ceil(progress.value * (duration / 1000)),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(updateDisplay)(current);
      }
    }
  );

  useEffect(() => {
    if (isRunning) {
      cancelAnimation(pulse);
      pulse.value = 1;
      progress.value = 1;
      progress.value = withTiming(0, { duration, easing: Easing.linear }, (finished) => {
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
          withTiming(1.08, { duration: 180 }),
          withTiming(1.0, { duration: 180 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [displaySeconds, isRunning]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <Svg
        width={SIZE}
        height={SIZE}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#2A1A50"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.seconds, { color }]}>{displaySeconds}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
  },
});

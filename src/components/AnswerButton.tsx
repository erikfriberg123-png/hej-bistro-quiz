import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens';

export type AnswerState = 'default' | 'correct' | 'wrong' | 'show-correct' | 'disabled';

interface Props {
  text: string;
  state: AnswerState;
  onPress: () => void;
  index: number;
  compact?: boolean;
}

const LABELS = ['A', 'B', 'C', 'D'];

export function AnswerButton({ text, state, onPress, index, compact }: Props) {
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong' || state === 'show-correct';

  const isCorrect = state === 'correct' || state === 'show-correct';
  const isWrong = state === 'wrong';

  const borderColor = isCorrect ? colors.correct : isWrong ? colors.wrong : colors.lineStrong;
  const bgColor = isCorrect
    ? 'rgba(54, 224, 168, 0.12)'
    : isWrong
    ? 'rgba(255, 90, 90, 0.12)'
    : colors.bg2;
  const labelBg = isCorrect ? colors.correct : isWrong ? colors.wrong : colors.lineStrong;
  const labelColor = isCorrect ? '#022' : isWrong ? '#200' : colors.text1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[styles.button, compact && styles.buttonCompact, { backgroundColor: bgColor, borderColor }]}
    >
      <View style={[styles.label, { backgroundColor: labelBg }]}>
        <Text style={[styles.labelText, { color: labelColor }]}>{LABELS[index]}</Text>
      </View>
      <Text style={[
        styles.text,
        compact && styles.textCompact,
        state === 'disabled' && styles.dimmed,
      ]}>
        {text}
      </Text>
      {isCorrect && <Text style={styles.checkmark}>✓</Text>}
      {isWrong && <Text style={styles.crossmark}>✕</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
    minHeight: 48,
  },
  buttonCompact: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 0,
    minHeight: 80,
    alignItems: 'flex-start',
  },
  label: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  labelText: {
    fontSize: 11,
    fontFamily: fonts.mono700,
    lineHeight: 14,
  },
  text: {
    flex: 1,
    color: colors.text1,
    fontSize: 14,
    fontFamily: fonts.display600,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  textCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  dimmed: {
    color: colors.text4,
  },
  checkmark: {
    color: colors.correct,
    fontSize: 18,
    fontFamily: fonts.display700,
    marginLeft: 8,
  },
  crossmark: {
    color: colors.wrong,
    fontSize: 16,
    fontFamily: fonts.display700,
    marginLeft: 8,
  },
});

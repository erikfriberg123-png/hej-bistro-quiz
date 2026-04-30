import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export type AnswerState = 'default' | 'correct' | 'wrong' | 'show-correct' | 'disabled';

interface Props {
  text: string;
  state: AnswerState;
  onPress: () => void;
  index: number;
}

const LABELS = ['A', 'B', 'C', 'D'];

export function AnswerButton({ text, state, onPress, index }: Props) {
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong' || state === 'show-correct';

  const borderColor =
    state === 'correct' || state === 'show-correct'
      ? '#4CAF50'
      : state === 'wrong'
      ? '#F44336'
      : '#3D2870';

  const bgColor =
    state === 'correct' || state === 'show-correct'
      ? 'rgba(76,175,80,0.18)'
      : state === 'wrong'
      ? 'rgba(244,67,54,0.18)'
      : '#1E1040';

  const labelBg =
    state === 'correct' || state === 'show-correct'
      ? '#4CAF50'
      : state === 'wrong'
      ? '#F44336'
      : '#3D2870';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[styles.button, { backgroundColor: bgColor, borderColor }]}
    >
      <View style={[styles.label, { backgroundColor: labelBg }]}>
        <Text style={styles.labelText}>{LABELS[index]}</Text>
      </View>
      <Text style={[styles.text, state === 'disabled' && styles.dimmed]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 56,
  },
  label: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
  },
  dimmed: {
    color: '#7060A0',
  },
});

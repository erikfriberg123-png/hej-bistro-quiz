import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts, radius } from '../theme/tokens';

interface Props {
  visible: boolean;
  questionText: string;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export function ComplaintModal({ visible, questionText, onClose, onSubmit }: Props) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    await onSubmit(message.trim());
    setLoading(false);
    setMessage('');
  };

  const handleClose = () => {
    if (loading) return;
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>⚠️  Klaga på fråga</Text>

          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{questionText}</Text>
          </View>

          <Text style={styles.label}>Beskriv felet</Text>
          <TextInput
            style={styles.input}
            placeholder="T.ex. Fel svar, felaktig stavning..."
            placeholderTextColor="#6050A0"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
          />

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn} disabled={loading}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, (!message.trim() || loading) && styles.submitDisabled]}
              disabled={!message.trim() || loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.submitText}>Skicka</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 14,
  },
  title: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
  },
  questionBox: {
    backgroundColor: colors.bg1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.bg3,
  },
  questionText: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    lineHeight: 20,
  },
  label: {
    color: colors.text2,
    fontSize: 13,
    fontFamily: fonts.display600,
  },
  input: {
    backgroundColor: colors.bg1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    color: colors.text1,
    fontFamily: fonts.display400,
    fontSize: 14,
    padding: 14,
    minHeight: 90,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.bg3,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text2,
    fontSize: 15,
    fontFamily: fonts.display600,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display700,
  },
});

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
            placeholderTextColor="#254A72"
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
    backgroundColor: '#0C1E35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
  },
  questionBox: {
    backgroundColor: '#030C1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#112540',
  },
  questionText: {
    color: '#7B9EC4',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  label: {
    color: '#7B9EC4',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  input: {
    backgroundColor: '#030C1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B3A5C',
    color: '#FFFFFF',
    fontFamily: 'DMSans_400Regular',
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
    backgroundColor: '#112540',
    alignItems: 'center',
  },
  cancelText: {
    color: '#7B9EC4',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1D6FE8',
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
  },
});

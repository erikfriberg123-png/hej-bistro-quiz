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
    backgroundColor: '#1E1040',
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
    backgroundColor: '#12082A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A1A50',
  },
  questionText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  label: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  input: {
    backgroundColor: '#12082A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3D2870',
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
    backgroundColor: '#2A1A50',
    alignItems: 'center',
  },
  cancelText: {
    color: '#B0A8C8',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#9B5DE5',
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

import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {
  validateStoryText,
  validateDisplayName,
  sanitizeStoryText,
  sanitizeDisplayName,
  pickStoryImage,
  uploadStoryImage,
  submitStory,
} from '../lib/stories'
import type { ImagePickerAsset } from 'expo-image-picker'

interface Props {
  userId: string | null
  username: string | null
  onClose: () => void
}

export function StoryModal({ userId, username, onClose }: Props) {
  const [text, setText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [displayName, setDisplayName] = useState(username ?? '')
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [textError, setTextError] = useState('')
  const [nameError, setNameError] = useState('')
  const [imageError, setImageError] = useState('')

  const charLeft = 2000 - text.length

  const handlePickImage = async () => {
    setImageError('')
    const asset = await pickStoryImage()
    if (!asset) return
    if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) {
      setImageError('Bilden är för stor (max 15 MB).')
      return
    }
    setImageAsset(asset)
  }

  const handleSubmit = async () => {
    const textErr = validateStoryText(text)
    const nameErr = isAnonymous ? null : validateDisplayName(displayName)
    if (textErr) { setTextError(textErr); return }
    if (nameErr) { setNameError(nameErr); return }

    setSending(true)

    let uploadedUrl: string | null = null
    if (imageAsset) {
      setUploading(true)
      const result = await uploadStoryImage(imageAsset)
      setUploading(false)
      if ('error' in result) {
        setImageError(result.error)
        setSending(false)
        return
      }
      uploadedUrl = result.url
    }

    const finalName = isAnonymous ? null : (displayName.trim() || null)
    const { error } = await submitStory(text, finalName, uploadedUrl, userId)
    setSending(false)
    if (error) { setTextError('Något gick fel. Försök igen.'); return }
    setSent(true)
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>🍽️ Berätta en kroghistoria</Text>
                <Text style={styles.subtitle}>Intressanta historier kan publiceras på sajten.</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {sent ? (
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>Tack för din historia!</Text>
                <Text style={styles.successBody}>
                  Vi läser igenom den och om den är läsvärd publicerar vi den på sajten.
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>Stäng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Textarea */}
                <TextInput
                  style={[styles.textarea, textError ? styles.inputError : null]}
                  value={text}
                  onChangeText={v => { setText(sanitizeStoryText(v)); setTextError('') }}
                  placeholder="Berätta en intressant händelse som du varit med om på restaurang."
                  placeholderTextColor="#6050A0"
                  multiline
                  maxLength={2000}
                  numberOfLines={7}
                  textAlignVertical="top"
                />
                <View style={styles.textareaFooter}>
                  {textError
                    ? <Text style={styles.errorText}>{textError}</Text>
                    : <View />}
                  <Text style={[styles.charCount, charLeft < 100 && styles.charCountWarn]}>
                    {charLeft} tecken kvar
                  </Text>
                </View>

                {/* Image */}
                <Text style={styles.label}>Bild (valfritt)</Text>
                {imageAsset ? (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: imageAsset.uri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => setImageAsset(null)}
                    >
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                    <Text style={styles.imagePickerText}>📸  Lägg till en bild</Text>
                  </TouchableOpacity>
                )}
                {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}

                {/* Anonymous toggle */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setIsAnonymous(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                    {isAnonymous && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.toggleLabel}>Skicka anonymt</Text>
                </TouchableOpacity>

                {/* Name input */}
                {!isAnonymous && (
                  <View style={styles.nameContainer}>
                    <Text style={styles.label}>Ditt namn (valfritt)</Text>
                    <TextInput
                      style={[styles.nameInput, nameError ? styles.inputError : null]}
                      value={displayName}
                      onChangeText={v => { setDisplayName(sanitizeDisplayName(v)); setNameError('') }}
                      placeholder="Skriv ditt namn eller alias..."
                      placeholderTextColor="#6050A0"
                      maxLength={50}
                    />
                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={sending || uploading}
                  style={[styles.submitBtn, (sending || uploading) && styles.submitBtnDisabled]}
                >
                  {sending || uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Skicka in min historia  →</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  Historier granskas innan publicering. Inga personuppgifter om tredje part.
                </Text>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1040',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3D2870',
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_800ExtraBold',
  },
  subtitle: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginTop: 4,
    lineHeight: 20,
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#B0A8C8', fontSize: 20, lineHeight: 24 },
  textarea: {
    backgroundColor: '#12082A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3D2870',
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
    minHeight: 140,
    marginBottom: 4,
  },
  inputError: { borderColor: '#FF5555' },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  charCount: {
    color: '#6050A0',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  charCountWarn: { color: '#FF8C42' },
  errorText: {
    color: '#FF5555',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 8,
  },
  label: {
    color: '#B0A8C8',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 8,
  },
  imagePicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3D2870',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  imageWrapper: { position: 'relative', marginBottom: 8 },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: '#fff', fontSize: 13, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#3D2870',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  checkmark: { color: '#fff', fontSize: 12, fontFamily: 'DMSans_700Bold', lineHeight: 15 },
  toggleLabel: { color: '#B0A8C8', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  nameContainer: { marginBottom: 4 },
  nameInput: {
    backgroundColor: '#12082A',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3D2870',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: '#2A1A50' },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },
  disclaimer: {
    color: '#4A4A6A',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successEmoji: { fontSize: 48, marginBottom: 14 },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 8,
  },
  successBody: {
    color: '#B0A8C8',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
})

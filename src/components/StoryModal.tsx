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
import { colors, fonts, radius, spacing } from '../theme/tokens'

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
            <View style={styles.handle} />

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>🍽️  Berätta en kroghistoria</Text>
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
                <TextInput
                  style={[styles.textarea, textError ? styles.inputError : null]}
                  value={text}
                  onChangeText={v => { setText(sanitizeStoryText(v)); setTextError('') }}
                  placeholder="Berätta en intressant händelse som du varit med om på restaurang."
                  placeholderTextColor={colors.text3}
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

                <Text style={styles.label}>Bild (valfritt)</Text>
                {imageAsset ? (
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: imageAsset.uri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImageAsset(null)}>
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                    <Text style={styles.imagePickerText}>📸  Lägg till en bild</Text>
                  </TouchableOpacity>
                )}
                {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}

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

                {!isAnonymous && (
                  <View style={styles.nameContainer}>
                    <Text style={styles.label}>Ditt namn (valfritt)</Text>
                    <TextInput
                      style={[styles.nameInput, nameError ? styles.inputError : null]}
                      value={displayName}
                      onChangeText={v => { setDisplayName(sanitizeDisplayName(v)); setNameError('') }}
                      placeholder="Skriv ditt namn eller alias..."
                      placeholderTextColor={colors.text3}
                      maxLength={50}
                    />
                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={sending || uploading}
                  style={[styles.submitBtn, (sending || uploading) && styles.submitBtnDisabled]}
                >
                  {sending || uploading ? (
                    <ActivityIndicator color={colors.bg0} />
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(54, 224, 224, 0.35)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.lineStrong,
    borderRightColor: colors.lineStrong,
    padding: spacing.s5,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    alignSelf: 'center',
    marginBottom: spacing.s5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.s4,
  },
  title: {
    color: colors.text1,
    fontSize: 17,
    fontFamily: fonts.display700,
  },
  subtitle: {
    color: colors.text3,
    fontSize: 13,
    fontFamily: fonts.display400,
    marginTop: 4,
    lineHeight: 19,
  },
  closeBtn: { padding: 4, marginLeft: 12 },
  closeBtnText: { color: colors.text3, fontSize: 18, lineHeight: 22 },

  textarea: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    padding: 14,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display400,
    lineHeight: 24,
    minHeight: 140,
    marginBottom: 4,
  },
  inputError: { borderColor: colors.wrong },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s4,
  },
  charCount: {
    color: colors.text3,
    fontSize: 12,
    fontFamily: fonts.mono500,
  },
  charCountWarn: { color: colors.yellow },
  errorText: {
    color: colors.wrong,
    fontSize: 12,
    fontFamily: fonts.display400,
    marginBottom: 8,
  },
  label: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: fonts.display600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  imagePicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display600,
  },
  imageWrapper: { position: 'relative', marginBottom: 8 },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
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
  imageRemoveText: { color: colors.text1, fontSize: 13, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg2,
  },
  checkboxChecked: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  checkmark: { color: '#1a0010', fontSize: 13, fontFamily: fonts.display700, lineHeight: 16 },
  toggleLabel: { color: colors.text2, fontSize: 14, fontFamily: fonts.display400 },
  nameContainer: { marginBottom: 4 },
  nameInput: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text1,
    fontSize: 15,
    fontFamily: fonts.display400,
    marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.s4,
    marginBottom: 12,
    shadowColor: colors.pink,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    color: '#1a0010',
    fontSize: 16,
    fontFamily: fonts.display700,
  },
  disclaimer: {
    color: colors.text4,
    fontSize: 12,
    fontFamily: fonts.display400,
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
    color: colors.text1,
    fontSize: 18,
    fontFamily: fonts.display700,
    marginBottom: 8,
  },
  successBody: {
    color: colors.text2,
    fontSize: 14,
    fontFamily: fonts.display400,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },
})

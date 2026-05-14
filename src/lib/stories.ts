import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

const ALLOWED_STORY = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîôœæç0-9 ,.!?\r\n]+$/
const ALLOWED_NAME  = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîôœæç0-9 ,.!?]+$/

export function validateStoryText(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Berätta något — fältet får inte vara tomt.'
  if (t.length < 20) return 'Historien är för kort (minst 20 tecken).'
  if (t.length > 2000) return 'Historien är för lång (max 2 000 tecken).'
  if (!ALLOWED_STORY.test(t))
    return 'Texten innehåller otillåtna tecken. Endast bokstäver, siffror och , . ! ? är tillåtna.'
  return null
}

export function validateDisplayName(name: string): string | null {
  const n = name.trim()
  if (!n) return null
  if (n.length > 50) return 'Namnet är för långt (max 50 tecken).'
  if (!ALLOWED_NAME.test(n))
    return 'Namnet innehåller otillåtna tecken.'
  return null
}

export function sanitizeStoryText(val: string): string {
  return val.replace(/[^a-zA-ZåäöÅÄÖéèêëàâùûüïîôœæç0-9 ,.!?\r\n]/g, '')
}

export function sanitizeDisplayName(val: string): string {
  return val.replace(/[^a-zA-ZåäöÅÄÖéèêëàâùûüïîôœæç0-9 ,.!?]/g, '')
}

export async function pickStoryImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return null
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  })
  if (result.canceled || !result.assets[0]) return null
  return result.assets[0]
}

export async function uploadStoryImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<{ url: string } | { error: string }> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    )
    const response = await fetch(manipulated.uri)
    const blob = await response.blob()
    const filename = `story_${Date.now()}.jpg`
    const { error: uploadErr } = await supabase.storage
      .from('story-images')
      .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
    if (uploadErr) return { error: uploadErr.message }
    const { data } = supabase.storage.from('story-images').getPublicUrl(filename)
    return { url: data.publicUrl }
  } catch {
    return { error: 'Bilduppladdning misslyckades.' }
  }
}

export async function submitStory(
  storyText: string,
  displayName: string | null,
  imageUrl: string | null,
  userId: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('restaurant_stories').insert({
    user_id: userId ?? null,
    display_name: displayName?.trim() || null,
    story_text: storyText.trim(),
    image_url: imageUrl ?? null,
    status: 'pending',
  })
  return error ? { error: error.message } : {}
}

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const BUCKET = 'question-images';
const MAX_DIMENSION = 800;
const COMPRESS_QUALITY = 0.72;

export async function pickAndUploadQuestionImage(): Promise<{ url: string } | { error: string }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Bildbiblioteket är inte tillgängligt. Tillåt åtkomst i inställningarna.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return { error: 'cancelled' };
  }

  const asset = result.assets[0];

  // Resize + compress to stay under 100kb
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width ?? MAX_DIMENSION, MAX_DIMENSION) } }],
    { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Fetch as blob for upload
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const filename = `q_${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl };
}

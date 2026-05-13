import { supabase } from './supabase';

export async function submitFeedback(
  message: string,
  userId: string | null,
  username: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId ?? null,
    username: username ?? null,
    message: message.trim(),
  });
  return error ? { error: error.message } : {};
}

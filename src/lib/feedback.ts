import { supabase } from './supabase';
import { TABLES } from './appConfig';

export async function submitFeedback(
  message: string,
  userId: string | null,
  username: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from(TABLES.feedback).insert({
    user_id: userId ?? null,
    username: username ?? null,
    message: message.trim(),
    source: 'quiz',
  });
  return error ? { error: error.message } : {};
}

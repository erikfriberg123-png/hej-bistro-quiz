import { supabase } from './supabase';
import { tablesForArea } from './appConfig';
import { type Area } from './branding';

export async function submitFeedback(
  message: string,
  userId: string | null,
  username: string | null,
  area: Area = 'krogen',
): Promise<{ error?: string }> {
  const { error } = await supabase.from(tablesForArea(area).feedback).insert({
    user_id: userId ?? null,
    username: username ?? null,
    message: message.trim(),
    source: 'quiz',
  });
  return error ? { error: error.message } : {};
}

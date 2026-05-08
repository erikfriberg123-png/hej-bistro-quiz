import { supabase } from './supabase';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  category_id: string;
  best_score: number;
}

export async function submitScore(categoryId: string, score: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('scores').insert({ user_id: user.id, category_id: categoryId, score });
  } catch {
    // silent fail — local gameplay is unaffected
  }
}

export async function fetchLeaderboard(categoryId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('category_id', categoryId)
    .order('best_score', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username.trim())
    .neq('id', user.id)
    .maybeSingle();
  return !data;
}

export async function setUsername(username: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  const { error } = await supabase
    .from('profiles')
    .update({ username: username.trim() })
    .eq('id', user.id);
  if (error) throw error;
}

export async function getUsername(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  return data?.username ?? null;
}

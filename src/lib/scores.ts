import { supabase } from './supabase';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  category_id: string;
  best_score: number;
}

export interface BattleLeaderboardEntry {
  user_id: string;
  username: string;
  total_score: number;
  wins: number;
  battles: number;
}

export async function fetchBattleLeaderboard(): Promise<BattleLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('battles')
    .select('creator_id, creator_name, opponent_id, opponent_name, creator_turns, opponent_turns, winner')
    .eq('status', 'finished')
    .not('opponent_id', 'is', null);

  if (error) throw error;

  const map = new Map<string, { username: string; score: number; wins: number; battles: number }>();

  const add = (id: string, name: string, score: number, won: boolean) => {
    const prev = map.get(id) ?? { username: name, score: 0, wins: 0, battles: 0 };
    map.set(id, { username: name, score: prev.score + score, wins: prev.wins + (won ? 1 : 0), battles: prev.battles + 1 });
  };

  for (const b of (data ?? []) as any[]) {
    const cTurns = Array.isArray(b.creator_turns) ? b.creator_turns : [];
    const oTurns = Array.isArray(b.opponent_turns) ? b.opponent_turns : [];
    const cScore = cTurns.reduce((s: number, t: any) => s + (t.score ?? 0), 0);
    const oScore = oTurns.reduce((s: number, t: any) => s + (t.score ?? 0), 0);
    if (b.creator_id && b.creator_name) add(b.creator_id, b.creator_name, cScore, b.winner === 'creator');
    if (b.opponent_id && b.opponent_name) add(b.opponent_id, b.opponent_name, oScore, b.winner === 'opponent');
  }

  return Array.from(map.entries())
    .map(([user_id, { username, score, wins, battles }]) => ({
      user_id, username, total_score: score, wins, battles,
    }))
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 50);
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

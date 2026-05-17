import { supabase } from './supabase';
import { type Area, DEFAULT_AREA } from './branding';
import { TABLES } from './appConfig';

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

export interface SurvivalLeaderboardEntry {
  user_id: string;
  username: string;
  best_score: number;
}

export async function fetchBattleLeaderboard(): Promise<BattleLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.battles)
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
    .sort((a, b) => b.wins - a.wins || b.total_score - a.total_score)
    .slice(0, 50);
}

export async function submitSurvivalScore(score: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from(TABLES.scores).insert({ user_id: user.id, category_id: 'survival_all', score });
  } catch {
    // silent fail — local gameplay is unaffected
  }
}

export async function fetchSurvivalLeaderboard(): Promise<SurvivalLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.leaderboard)
    .select('user_id, username, best_score')
    .eq('category_id', 'survival_all')
    .order('best_score', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as SurvivalLeaderboardEntry[];
}

export async function submitScore(categoryId: string, score: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from(TABLES.scores).insert({ user_id: user.id, category_id: categoryId, score });
  } catch {
    // silent fail — local gameplay is unaffected
  }
}

export async function fetchLeaderboard(categoryId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from(TABLES.leaderboard)
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

const USERNAME_RE = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîôœæç0-9 _-]+$/;

export async function setUsername(username: string, area?: Area): Promise<void> {
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 30) throw new Error('Användarnamnet måste vara 2–30 tecken.');
  if (!USERNAME_RE.test(trimmed)) throw new Error('Användarnamnet innehåller otillåtna tecken.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  const { error } = await supabase
    .from('profiles')
    .update({ username: trimmed, ...(area ? { area } : {}) })
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

export async function getUserProfile(): Promise<{ username: string | null; area: Area }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { username: null, area: DEFAULT_AREA };
  const { data } = await supabase
    .from('profiles')
    .select('username, area')
    .eq('id', user.id)
    .single();
  return {
    username: data?.username ?? null,
    area: (data?.area as Area) ?? DEFAULT_AREA,
  };
}

export async function setArea(area: Area): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  const { error } = await supabase
    .from('profiles')
    .update({ area })
    .eq('id', user.id);
  if (error) throw error;
}

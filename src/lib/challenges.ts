import { supabase } from './supabase';

export interface Challenge {
  id: string;
  code: string;
  category_id: string;
  question_ids: string[];
  creator_id: string;
  creator_name: string;
  creator_score: number;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_score: number | null;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createChallenge(
  categoryId: string,
  questionIds: string[],
  score: number,
  creatorName: string,
): Promise<{ code: string; id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const code = generateCode();
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      code,
      category_id: categoryId,
      question_ids: questionIds,
      creator_id: user.id,
      creator_name: creatorName,
      creator_score: score,
    })
    .select('id, code')
    .single();

  if (error) throw error;
  return { code: data.code, id: data.id };
}

export async function getChallengeByCode(code: string): Promise<Challenge | null> {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();
  return (data as Challenge) ?? null;
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();
  return (data as Challenge) ?? null;
}

export async function findRandomChallenge(): Promise<Challenge | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('challenges')
    .select('*')
    .is('opponent_id', null)
    .neq('creator_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return (data as Challenge) ?? null;
}

export async function joinChallenge(
  challengeId: string,
  score: number,
  opponentName: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('challenges')
    .update({
      opponent_id: user.id,
      opponent_name: opponentName,
      opponent_score: score,
    })
    .eq('id', challengeId)
    .is('opponent_id', null);

  if (error) throw error;
}

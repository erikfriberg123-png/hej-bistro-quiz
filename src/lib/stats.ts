import { supabase } from './supabase';
import { TABLES, RPCS } from './appConfig';

export interface QuestionStat {
  question_id: string;
  total: number;
  correct_count: number;
  correct_rate: number;
}

export interface DailyBattleStat {
  day: string;
  battle_count: number;
  player_count: number;
}

export function trackAttempt(
  questionId: string,
  correct: boolean,
  source: 'game' | 'battle' | 'daily' = 'game',
): void {
  supabase.auth.getUser().then(({ data: { user } }) => {
    supabase.from(TABLES.attempts).insert({
      question_id: questionId,
      user_id: user?.id ?? null,
      correct,
      source,
    }).then(() => {});
  });
}

export async function getQuestionStats(): Promise<QuestionStat[]> {
  const { data, error } = await supabase.rpc(RPCS.questionStats);
  if (error) throw error;
  return (data ?? []) as QuestionStat[];
}

export async function getBattlesPerDay(): Promise<DailyBattleStat[]> {
  const { data, error } = await supabase.rpc(RPCS.battlesPerDay);
  if (error) throw error;
  return (data ?? []) as DailyBattleStat[];
}

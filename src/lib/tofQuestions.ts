import { supabase } from './supabase';
import { type TofQuestion, type TofDifficulty } from '../types';
import { type Area } from './branding';

export const TOF_ROUND_DIFFICULTIES: TofDifficulty[] = [
  'easy',
  'medium',
  'hard',
];

export const TOF_TOTAL_ROUNDS = 3;
export const TOF_QUESTIONS_PER_ROUND = 10;
export const TOF_POINTS_PER_CORRECT = 50;
export const TOF_TIMER_SECONDS = 7;

export const TOF_DIFFICULTY_LABEL: Record<TofDifficulty, string> = {
  easy: 'Lätt',
  easy_medium: 'Lätt–medel',
  medium: 'Medel',
  medium_hard: 'Medel–svår',
  hard: 'Svår',
};

export async function fetchTofQuestions(area: Area, difficulty: TofDifficulty): Promise<TofQuestion[]> {
  const { data, error } = await supabase
    .from('truth_or_false_questions')
    .select('id, statement, answer, difficulty, area')
    .eq('active', true)
    .eq('area', area)
    .eq('difficulty', difficulty)
    .is('deleted_at', null);

  if (error) throw error;
  return (data ?? []) as TofQuestion[];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

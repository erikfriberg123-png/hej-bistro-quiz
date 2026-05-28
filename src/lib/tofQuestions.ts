import { supabase } from './supabase';
import { tablesForArea } from './appConfig';
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
  // VOO uses a prefixed table on its own Supabase instance (no area column).
  // All other segments use the shared truth_or_false_questions table, tagged by area.
  const isSharedTable = area !== 'sjukvard';
  const tableName = isSharedTable ? 'truth_or_false_questions' : tablesForArea(area).tofQuestions;

  const baseQuery = supabase
    .from(tableName)
    .select('id, statement, answer, difficulty')
    .eq('active', true)
    .eq('difficulty', difficulty)
    .is('deleted_at', null)
    .limit(100);

  const { data, error } = await (isSharedTable ? baseQuery.eq('area', area) : baseQuery);

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

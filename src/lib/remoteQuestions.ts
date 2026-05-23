import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { APP_ID, tablesForArea } from './appConfig';
import { Question, CategoryId, Difficulty } from '../types';
import { type Area, DEFAULT_AREA } from './branding';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheKey(area: Area) {
  return `remote-questions-v3-${area}`;
}

interface Cache {
  questions: Question[];
  fetchedAt: number;
}

function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    category: row.category_id as CategoryId,
    question: row.question,
    answers: row.answers as [string, string, string, string],
    correctIndex: row.correct_index as 0 | 1 | 2 | 3,
    difficulty: row.difficulty as Difficulty,
    active: row.active as boolean,
    ...(row.image_url ? { imageUrl: row.image_url as string } : {}),
    ...(row.forklaring ? { forklaring: row.forklaring as string } : {}),
  };
}

export async function fetchRemoteQuestions(area: Area = DEFAULT_AREA): Promise<Question[]> {
  const key = cacheKey(area);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cache: Cache = JSON.parse(raw);
      if (Date.now() - cache.fetchedAt < CACHE_TTL) {
        return cache.questions;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from(tablesForArea(area).questions)
      .select('id, category_id, question, answers, correct_index, difficulty, active, image_url, forklaring')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const questions = (data ?? []).map(rowToQuestion);
    await AsyncStorage.setItem(key, JSON.stringify({ questions, fetchedAt: Date.now() }));
    return questions;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) return (JSON.parse(raw) as Cache).questions;
    } catch {}
    return [];
  }
}

export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (!ids.length) return [];
  const [r1, r2] = await Promise.all([
    supabase.from('remote_questions').select('*').in('id', ids),
    supabase.from('voo_remote_questions').select('*').in('id', ids),
  ]);
  const all = [...(r1.data ?? []), ...(r2.data ?? [])].map(rowToQuestion);
  return ids
    .map(id => all.find(q => q.id === id))
    .filter((q): q is Question => q !== undefined);
}

export async function invalidateQuestionCache(area?: Area): Promise<void> {
  if (area) {
    await AsyncStorage.removeItem(cacheKey(area));
  } else {
    // Invalidate all area caches
    await AsyncStorage.removeItem(cacheKey('krogen'));
    await AsyncStorage.removeItem(cacheKey('sjukvard'));
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Question, CategoryId, Difficulty } from '../types';

const CACHE_KEY = 'remote-questions-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  };
}

export async function fetchRemoteQuestions(): Promise<Question[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cache: Cache = JSON.parse(raw);
      if (Date.now() - cache.fetchedAt < CACHE_TTL) {
        return cache.questions;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('remote_questions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const questions = (data ?? []).map(rowToQuestion);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ questions, fetchedAt: Date.now() }));
    return questions;
  } catch {
    // Stale cache is better than nothing
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) return (JSON.parse(raw) as Cache).questions;
    } catch {}
    return [];
  }
}

export async function invalidateQuestionCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

export async function fetchAllQuestionsAdmin(): Promise<Question[]> {
  const { data, error } = await supabase
    .from('remote_questions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToQuestion);
}

export async function addRemoteQuestions(qs: Omit<Question, 'id'>[]): Promise<void> {
  const rows = qs.map(q => ({
    id: `rq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category_id: q.category,
    question: q.question,
    answers: q.answers,
    correct_index: q.correctIndex,
    difficulty: q.difficulty,
    active: true,
    ...(q.imageUrl ? { image_url: q.imageUrl } : {}),
  }));
  const { error } = await supabase.from('remote_questions').insert(rows);
  if (error) throw error;
  await invalidateQuestionCache();
}

export async function addRemoteQuestion(q: Omit<Question, 'id'>): Promise<void> {
  const id = `rq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('remote_questions').insert({
    id,
    category_id: q.category,
    question: q.question,
    answers: q.answers,
    correct_index: q.correctIndex,
    difficulty: q.difficulty,
    active: true,
    ...(q.imageUrl ? { image_url: q.imageUrl } : {}),
  });
  if (error) throw error;
  await invalidateQuestionCache();
}

export async function toggleRemoteQuestion(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('remote_questions')
    .update({ active })
    .eq('id', id);
  if (error) throw error;
  await invalidateQuestionCache();
}

export async function deleteRemoteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('remote_questions').delete().eq('id', id);
  if (error) throw error;
  await invalidateQuestionCache();
}

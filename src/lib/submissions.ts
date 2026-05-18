import { supabase } from './supabase';
import { TABLES } from './appConfig';
import type { CategoryId, Difficulty } from '../types';

export interface Complaint {
  id: string;
  question_id: string;
  question_text: string;
  category_id: string;
  message: string;
  complained_username: string;
  created_at: string;
}

export interface QuestionSubmission {
  category: CategoryId;
  question: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
  imageUrl?: string;
}

export async function submitQuestion(data: QuestionSubmission): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Inte inloggad' };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from(TABLES.submissions)
    .select('id', { count: 'exact', head: true })
    .eq('submitted_by', user.id)
    .gt('created_at', oneHourAgo);
  if ((count ?? 0) >= 3) {
    return { error: 'Du kan max skicka in 3 frågor per timme.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from(TABLES.submissions).insert({
    category_id: data.category,
    question: data.question,
    answers: data.answers,
    correct_index: data.correctIndex,
    difficulty: data.difficulty,
    submitted_by: user.id,
    submitted_username: (profile as any)?.username ?? 'Anonym',
    status: 'pending',
    ...(data.imageUrl ? { image_url: data.imageUrl } : {}),
  });

  return error ? { error: error.message } : {};
}

export async function submitComplaint(
  questionId: string,
  questionText: string,
  categoryId: string,
  message: string,
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Inte inloggad' };

  const { count: dupCount } = await supabase
    .from(TABLES.complaints)
    .select('id', { count: 'exact', head: true })
    .eq('complained_by', user.id)
    .eq('question_id', questionId);
  if ((dupCount ?? 0) > 0) {
    return { error: 'Du har redan rapporterat den här frågan.' };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from(TABLES.complaints)
    .select('id', { count: 'exact', head: true })
    .eq('complained_by', user.id)
    .gt('created_at', oneHourAgo);
  if ((count ?? 0) >= 5) {
    return { error: 'För många rapporter. Försök igen om en stund.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from(TABLES.complaints).insert({
    question_id: questionId,
    question_text: questionText,
    category_id: categoryId,
    message,
    complained_by: user.id,
    complained_username: (profile as any)?.username ?? 'Anonym',
  });

  return error ? { error: error.message } : {};
}

export async function getComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from(TABLES.complaints)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Complaint[];
}

export async function dismissComplaint(id: string): Promise<void> {
  const { error } = await supabase.from(TABLES.complaints).delete().eq('id', id);
  if (error) throw error;
}

export interface SubmittedQuestion {
  id: string;
  category_id: CategoryId;
  question: string;
  answers: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
  submitted_by: string;
  submitted_username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  image_url?: string;
}

export async function getPendingSubmissions(): Promise<SubmittedQuestion[]> {
  const { data, error } = await supabase
    .from(TABLES.submissions)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubmittedQuestion[];
}

export async function approveSubmission(sub: SubmittedQuestion): Promise<void> {
  const id = `rq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { error: insertErr } = await supabase.from(TABLES.questions).insert({
    id,
    category_id: sub.category_id,
    question: sub.question,
    answers: sub.answers,
    correct_index: sub.correct_index,
    difficulty: sub.difficulty,
    active: true,
    ...(sub.image_url ? { image_url: sub.image_url } : {}),
  });
  if (insertErr) throw insertErr;
  const { error: updateErr } = await supabase
    .from(TABLES.submissions)
    .update({ status: 'approved' })
    .eq('id', sub.id);
  if (updateErr) throw updateErr;
}

export async function rejectSubmission(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.submissions)
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

import { supabase } from './supabase';
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
}

export async function submitQuestion(data: QuestionSubmission): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Inte inloggad' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from('submitted_questions').insert({
    category_id: data.category,
    question: data.question,
    answers: data.answers,
    correct_index: data.correctIndex,
    difficulty: data.difficulty,
    submitted_by: user.id,
    submitted_username: (profile as any)?.username ?? 'Anonym',
    status: 'pending',
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from('question_complaints').insert({
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
    .from('question_complaints')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Complaint[];
}

export async function dismissComplaint(id: string): Promise<void> {
  const { error } = await supabase.from('question_complaints').delete().eq('id', id);
  if (error) throw error;
}

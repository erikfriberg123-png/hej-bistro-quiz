import { supabase } from './supabase';
import { CategoryId } from '../types';

export interface BattleTurn {
  round: number;
  category: CategoryId;
  score: number;
  questionIds?: string[];
}

export interface Battle {
  id: string;
  code: string;
  creator_id: string;
  creator_name: string;
  opponent_id: string | null;
  opponent_name: string | null;
  creator_turns: BattleTurn[];
  opponent_turns: BattleTurn[];
  status: 'waiting_opponent' | 'creator_turn' | 'opponent_turn' | 'finished';
  winner: 'creator' | 'opponent' | 'draw' | null;
  created_at: string;
}

export interface BattleComputedState {
  creatorScore: number;
  opponentScore: number;
  completedRounds: number;
  isSuddenDeath: boolean;
  isFinished: boolean;
  winner: 'creator' | 'opponent' | 'draw' | null;
  nextTurn: 'creator' | 'opponent';
}

function parseJsonbArray(value: unknown): BattleTurn[] {
  if (Array.isArray(value)) return value as BattleTurn[];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as BattleTurn[]; } catch { return []; }
  }
  return [];
}

export function normalizeBattle(raw: unknown): Battle {
  const b = raw as Record<string, unknown>;
  return {
    ...(b as Battle),
    creator_turns: parseJsonbArray(b.creator_turns),
    opponent_turns: parseJsonbArray(b.opponent_turns),
  };
}

export function computeBattleState(battle: Battle): BattleComputedState {
  const creatorScore = battle.creator_turns.reduce((s, t) => s + t.score, 0);
  const opponentScore = battle.opponent_turns.reduce((s, t) => s + t.score, 0);
  const creatorRoundsPlayed = battle.creator_turns.length;
  const opponentRoundsPlayed = battle.opponent_turns.length;
  const completedRounds = Math.min(creatorRoundsPlayed, opponentRoundsPlayed);
  const nextTurn: 'creator' | 'opponent' =
    creatorRoundsPlayed > opponentRoundsPlayed ? 'opponent' : 'creator';

  let isFinished = battle.status === 'finished';
  let winner: 'creator' | 'opponent' | 'draw' | null = battle.winner ?? null;

  if (!isFinished && creatorRoundsPlayed >= 4 && opponentRoundsPlayed >= 4) {
    isFinished = true;
    if (creatorScore > opponentScore) winner = 'creator';
    else if (opponentScore > creatorScore) winner = 'opponent';
    else winner = 'draw';
  }

  return { creatorScore, opponentScore, completedRounds, isSuddenDeath: false, isFinished, winner, nextTurn };
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createBattle(creatorName: string, targetOpponentId?: string): Promise<Battle> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');

  const code = generateCode();
  const { data, error } = await supabase
    .from('battles')
    .insert({
      code,
      creator_id: user.id,
      creator_name: creatorName,
      creator_turns: [],
      opponent_turns: [],
      status: 'waiting_opponent',
      winner: null,
      ...(targetOpponentId ? { target_opponent_id: targetOpponentId } : {}),
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeBattle(data);
}

export async function getPendingBattlesForMe(): Promise<Battle[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('battles')
    .select('*')
    .eq('target_opponent_id', user.id)
    .eq('status', 'waiting_opponent')
    .order('created_at', { ascending: false });

  return (data ?? []).map(normalizeBattle);
}

export async function declineBattle(battleId: string): Promise<void> {
  await supabase.from('battles').delete().eq('id', battleId);
}

export async function forfeitBattle(battleId: string, role: 'creator' | 'opponent'): Promise<void> {
  const winner: Battle['winner'] = role === 'creator' ? 'opponent' : 'creator';
  const { error } = await supabase
    .from('battles')
    .update({ status: 'finished', winner })
    .eq('id', battleId);
  if (error) throw error;
}

export async function findActiveBattleBetween(targetOpponentId: string): Promise<Battle | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('battles')
    .select('*')
    .neq('status', 'finished')
    .or(
      `and(creator_id.eq.${user.id},target_opponent_id.eq.${targetOpponentId}),` +
      `and(creator_id.eq.${targetOpponentId},target_opponent_id.eq.${user.id}),` +
      `and(creator_id.eq.${targetOpponentId},opponent_id.eq.${user.id})`
    )
    .limit(1);

  const row = (data ?? [])[0];
  return row ? normalizeBattle(row) : null;
}

export async function getBattleByCode(code: string): Promise<Battle | null> {
  const { data } = await supabase
    .from('battles')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();
  return data ? normalizeBattle(data) : null;
}

export async function getBattleById(id: string): Promise<Battle | null> {
  const { data } = await supabase
    .from('battles')
    .select('*')
    .eq('id', id)
    .single();
  return data ? normalizeBattle(data) : null;
}

export async function getMyBattles(): Promise<Battle[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('battles')
    .select('*')
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .neq('status', 'finished')
    .order('created_at', { ascending: false });

  return (data ?? []).map(normalizeBattle);
}

export interface HeadToHeadStats {
  myWins: number;
  theirWins: number;
  draws: number;
  total: number;
}

export async function getHeadToHeadStats(opponentId: string): Promise<HeadToHeadStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { myWins: 0, theirWins: 0, draws: 0, total: 0 };

  const { data } = await supabase
    .from('battles')
    .select('creator_id, winner')
    .eq('status', 'finished')
    .or(
      `and(creator_id.eq.${user.id},opponent_id.eq.${opponentId}),` +
      `and(creator_id.eq.${opponentId},opponent_id.eq.${user.id})`
    );

  const rows = (data ?? []) as { creator_id: string; winner: string | null }[];
  let myWins = 0, theirWins = 0, draws = 0;
  for (const b of rows) {
    if (b.winner === 'draw') { draws++; continue; }
    const iWasCreator = b.creator_id === user.id;
    if ((iWasCreator && b.winner === 'creator') || (!iWasCreator && b.winner === 'opponent')) {
      myWins++;
    } else {
      theirWins++;
    }
  }
  return { myWins, theirWins, draws, total: rows.length };
}

export async function getMyActiveTurns(): Promise<Battle[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('battles')
    .select('*')
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in('status', ['creator_turn', 'opponent_turn'])
    .order('created_at', { ascending: false });

  const battles = (data ?? []) as Battle[];
  return battles.filter(b => {
    const state = computeBattleState(b);
    if (state.isFinished) return false;
    return (b.creator_id === user.id && state.nextTurn === 'creator') ||
           (b.opponent_id === user.id && state.nextTurn === 'opponent');
  });
}

export async function submitTurn(
  battleId: string,
  role: 'creator' | 'opponent',
  turn: BattleTurn,
  opponentName?: string,
): Promise<Battle> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');

  const current = await getBattleById(battleId);
  if (!current) throw new Error('Slag hittades inte');

  const updatedCreatorTurns = role === 'creator'
    ? [...current.creator_turns, turn]
    : current.creator_turns;
  const updatedOpponentTurns = role === 'opponent'
    ? [...current.opponent_turns, turn]
    : current.opponent_turns;

  const tempBattle: Battle = {
    ...current,
    creator_turns: updatedCreatorTurns,
    opponent_turns: updatedOpponentTurns,
  };
  const state = computeBattleState(tempBattle);

  let newStatus: Battle['status'];
  if (state.isFinished) {
    newStatus = 'finished';
  } else if (role === 'creator') {
    newStatus = current.opponent_id ? 'opponent_turn' : 'waiting_opponent';
  } else {
    newStatus = 'creator_turn';
  }

  const updates: Record<string, unknown> = {
    creator_turns: updatedCreatorTurns,
    opponent_turns: updatedOpponentTurns,
    status: newStatus,
  };

  if (state.isFinished) updates.winner = state.winner;
  if (role === 'opponent' && !current.opponent_id) {
    updates.opponent_id = user.id;
    updates.opponent_name = opponentName ?? 'Anonym';
  }

  const { data, error } = await supabase
    .from('battles')
    .update(updates)
    .eq('id', battleId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeBattle(data);
}

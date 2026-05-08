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
  match_type: 'friend' | 'random';
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

export type BattlePhase =
  | 'waiting_opponent'
  | 'creator_challenge'   // creator picks category & plays
  | 'opponent_respond'    // opponent sees challenge, accepts or declines
  | 'opponent_challenge'  // opponent picks category & plays
  | 'creator_respond'     // creator sees challenge, accepts or declines
  | 'finished';

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
    ...(b as unknown as Battle),
    creator_turns: parseJsonbArray(b.creator_turns),
    opponent_turns: parseJsonbArray(b.opponent_turns),
  };
}

export function computeBattlePhase(battle: Battle): BattlePhase {
  if (battle.status === 'finished') return 'finished';
  const ct = battle.creator_turns.length;
  const ot = battle.opponent_turns.length;
  if (ct === ot && ct >= 4) return 'finished';
  if (battle.status === 'waiting_opponent') {
    return ct > 0 ? 'opponent_respond' : 'waiting_opponent';
  }
  if (ct > ot) return 'opponent_respond';
  if (ot > ct) return 'creator_respond';
  return ct % 2 === 0 ? 'creator_challenge' : 'opponent_challenge';
}

export function getChallengeForResponder(
  battle: Battle,
): { category: CategoryId; questionIds: string[]; challengerName: string } | null {
  const ct = battle.creator_turns.length;
  const ot = battle.opponent_turns.length;

  if (ct > ot) {
    const lastTurn = battle.creator_turns[ct - 1];
    if (!lastTurn?.questionIds?.length) return null;
    return { category: lastTurn.category, questionIds: lastTurn.questionIds, challengerName: battle.creator_name };
  }
  if (ot > ct) {
    const lastTurn = battle.opponent_turns[ot - 1];
    if (!lastTurn?.questionIds?.length) return null;
    return { category: lastTurn.category, questionIds: lastTurn.questionIds, challengerName: battle.opponent_name ?? 'Motståndare' };
  }
  return null;
}

export function computeBattleState(battle: Battle): BattleComputedState {
  const creatorScore = battle.creator_turns.reduce((s, t) => s + t.score, 0);
  const opponentScore = battle.opponent_turns.reduce((s, t) => s + t.score, 0);
  const ct = battle.creator_turns.length;
  const ot = battle.opponent_turns.length;
  const completedRounds = Math.min(ct, ot);

  // nextTurn: who needs to act next
  // If turns are unequal, the one with fewer turns responds
  // If turns are equal, the challenger for the next round takes their turn (alternates)
  const nextTurn: 'creator' | 'opponent' = (() => {
    if (ct > ot) return 'opponent'; // creator challenged, opponent responds
    if (ot > ct) return 'creator';  // opponent challenged, creator responds
    return ct % 2 === 0 ? 'creator' : 'opponent'; // equal: alternate challenger
  })();

  let isFinished = battle.status === 'finished';
  let winner: 'creator' | 'opponent' | 'draw' | null = battle.winner ?? null;

  if (!isFinished && ct >= 4 && ot >= 4) {
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

export async function createBattle(
  creatorName: string,
  targetOpponentId?: string,
  matchType: 'friend' | 'random' = 'friend',
): Promise<Battle> {
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
      match_type: matchType,
      ...(targetOpponentId ? { target_opponent_id: targetOpponentId } : {}),
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeBattle(data);
}

export async function findOpenRandomBattle(): Promise<Battle | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('battles')
    .select('*')
    .eq('match_type', 'random')
    .eq('status', 'waiting_opponent')
    .neq('creator_id', user.id)
    .order('created_at', { ascending: true })
    .limit(10);

  // Only join battles where the creator has already played their first round
  const battles = (data ?? []).map(normalizeBattle);
  return battles.find(b => b.creator_turns.length > 0) ?? null;
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

export async function joinBattle(battleId: string, opponentName: string): Promise<Battle> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');

  const current = await getBattleById(battleId);
  if (!current) throw new Error('Slag hittades inte');

  const ct = current.creator_turns.length;
  const newStatus: Battle['status'] = ct > 0 ? 'opponent_turn' : 'creator_turn';

  const { data, error } = await supabase
    .from('battles')
    .update({ opponent_id: user.id, opponent_name: opponentName, status: newStatus })
    .eq('id', battleId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeBattle(data);
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

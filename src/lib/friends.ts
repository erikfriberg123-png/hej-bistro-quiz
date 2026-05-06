import { supabase } from './supabase';

export interface FriendProfile {
  user_id: string;
  username: string;
  createdAt?: string;
}

export async function searchUsers(query: string): Promise<FriendProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || query.trim().length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${query.trim()}%`)
    .neq('id', user.id)
    .not('username', 'is', null)
    .limit(10);

  if (error) throw error;
  return (data ?? []).map(p => ({ user_id: p.id, username: p.username }));
}

export async function sendFriendRequest(friendId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  const { error } = await supabase.from('friends').insert({
    user_id: user.id,
    friend_id: friendId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptFriendRequest(requesterId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');

  await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('user_id', requesterId)
    .eq('friend_id', user.id);

  await supabase.from('friends').upsert(
    { user_id: user.id, friend_id: requesterId, status: 'accepted' },
    { onConflict: 'user_id,friend_id' },
  );
}

export async function removeFriend(friendId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  await supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendId);
  await supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', user.id);
}

export async function getFriends(): Promise<FriendProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from('friends')
    .select('friend_id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.friend_id);
  const createdAtMap = Object.fromEntries(rows.map(r => [r.friend_id, r.created_at as string]));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);

  return (profiles ?? []).map(p => ({
    user_id: p.id,
    username: p.username ?? 'Okänd',
    createdAt: createdAtMap[p.id],
  }));
}

export async function getPendingRequests(): Promise<FriendProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from('friends')
    .select('user_id')
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ids);

  return (profiles ?? []).map(p => ({ user_id: p.id, username: p.username ?? 'Okänd' }));
}

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export async function getFriendStatus(targetId: string): Promise<FriendStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'none';

  const { data: sent } = await supabase
    .from('friends')
    .select('status')
    .eq('user_id', user.id)
    .eq('friend_id', targetId)
    .maybeSingle();

  if (sent) return sent.status === 'accepted' ? 'accepted' : 'pending_sent';

  const { data: received } = await supabase
    .from('friends')
    .select('status')
    .eq('user_id', targetId)
    .eq('friend_id', user.id)
    .maybeSingle();

  if (received) return received.status === 'accepted' ? 'accepted' : 'pending_received';

  return 'none';
}

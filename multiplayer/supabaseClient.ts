import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[multiplayer] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — multiplayer disabled.'
      );
    }
    return null;
  }
  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
  return cached;
};

export const isMultiplayerAvailable = (): boolean => getSupabaseClient() !== null;

export const getOrCreateLocalPlayerId = (): string => {
  if (typeof window === 'undefined') return crypto.randomUUID();
  // Use per-tab session identity so multiple local windows can join as distinct peers.
  // sessionStorage survives reloads in the same tab but is isolated across tabs/windows.
  const SESSION_KEY = 'eco_mp_player_id_v2_session';
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, fresh);
  return fresh;
};

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

const createLocalPlayerId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateLocalPlayerId = (): string => {
  if (typeof window === 'undefined') return createLocalPlayerId();
  // Use per-tab session identity so multiple local windows can join as distinct peers.
  // sessionStorage survives reloads in the same tab but is isolated across tabs/windows.
  const SESSION_KEY = 'eco_mp_player_id_v2_session';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
  } catch {
    // Some mobile/private contexts can block sessionStorage on LAN HTTP dev URLs.
  }

  const fresh = createLocalPlayerId();
  try {
    window.sessionStorage.setItem(SESSION_KEY, fresh);
  } catch {
    // A non-persisted id is fine for solo and still lets the app boot.
  }
  return fresh;
};

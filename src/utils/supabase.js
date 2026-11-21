import { createClient } from '@supabase/supabase-js';

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('qe_supabase_url') || '';
  const localKey = localStorage.getItem('qe_supabase_anon_key') || '';

  const url = (localUrl || envUrl).trim();
  const key = (localKey || envKey).trim();

  const isConfigured = Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('your_supabase_url')
  );

  return { url, key, isConfigured };
};

let cachedClient = null;
let lastUrl = '';
let lastKey = '';

export const getSupabase = () => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false }
    });
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err);
    return null;
  }
};

export const saveSupabaseCredentials = (url, key) => {
  if (url) localStorage.setItem('qe_supabase_url', url.trim());
  else localStorage.removeItem('qe_supabase_url');

  if (key) localStorage.setItem('qe_supabase_anon_key', key.trim());
  else localStorage.removeItem('qe_supabase_anon_key');

  cachedClient = null;
};

export const testSupabaseConnection = async () => {
  const client = getSupabase();
  if (!client) return { connected: false, error: 'Supabase credentials not configured' };

  try {
    const { error } = await client.from('app_users').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet, it's connected to Supabase but needs schema script run
      if (error.code === '42P01') {
        return { connected: true, needsSchema: true, message: 'Connected, but tables need to be created using supabase_schema.sql' };
      }
      return { connected: false, error: error.message };
    }
    return { connected: true, message: 'Connected to Supabase PostgreSQL' };
  } catch (err) {
    return { connected: false, error: err.message };
  }
};

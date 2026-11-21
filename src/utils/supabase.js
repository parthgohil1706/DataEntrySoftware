import { createClient } from '@supabase/supabase-js';

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('qe_supabase_url') || '';
  const localKey = localStorage.getItem('qe_supabase_anon_key') || '';

  let url = (localUrl || envUrl).trim();
  // Strip trailing /rest/v1 or slashes if user copied the full API endpoint
  if (url) {
    url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  }
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
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { connected: true, needsSchema: true, message: 'Connected to Supabase! Run the SQL script in SQL Editor to create tables.' };
      }
      return { connected: false, error: error.message };
    }
    return { connected: true, message: 'Connected to Supabase PostgreSQL' };
  } catch (err) {
    return { connected: false, error: err.message };
  }
};

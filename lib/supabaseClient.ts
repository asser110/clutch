import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  "";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// v4.0 Deep Diagnostics
export const testConnection = async () => {
  try {
    console.log('--- Supabase Deep Audit v4.0 ---');
    console.log('URL Configured:', !!supabaseUrl);
    console.log('Key Configured:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) return { success: false, error: 'MISSING_KEYS' };

    const { data, error } = await createClient(supabaseUrl, supabaseAnonKey)
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Connection Test Error Object:', error);
      // Specifically checking for 404 or Fetch errors
      if (error.message?.includes('Failed to fetch')) return { success: false, error: 'NETWORK_ERROR' };
      return { success: false, error: error.message };
    }

    console.log('Connection Test Success!');
    return { success: true };
  } catch (e: any) {
    console.error('Connection Test Crash:', e);
    return { success: false, error: e.message || 'CRASH' };
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



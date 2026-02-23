import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_VITE_PUBLIC_SUPABASE_URL; // Catch the messy ones

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_VITE_PUBLIC_SUPABASE_ANON_KEY;

// Debug log to help identify configuration issues in production
if (typeof window !== 'undefined') {
  console.log('Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length,
    origin: window.location.origin
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase credentials missing! Check Vercel environment variables.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');


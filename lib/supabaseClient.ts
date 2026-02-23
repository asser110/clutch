import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;

// Debug log to help identify configuration issues in production
if (typeof window !== 'undefined') {
  console.log('Supabase Connection Audit:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    origin: window.location.origin
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase credentials missing! Check Vercel environment variables.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

import { createClient } from '@supabase/supabase-js'

// This will securely pull the credentials from your Vercel project settings.
// Make sure you have set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY there.
// Fix: Cast `import.meta` to `any` to access Vite environment variables without TypeScript errors.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This message will be more helpful for debugging.
  const errorMessage = "Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel environment variables.";
  alert(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
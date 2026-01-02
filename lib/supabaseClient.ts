import { createClient } from '@supabase/supabase-js'

// --- IMPORTANT ---
// The Supabase credentials have been placed here directly because this
// development environment runs code in the browser without a build step,
// which means it cannot read from a standard .env file.
// In a typical production setup, these would be loaded from secure
// environment variables.
const supabaseUrl = "https://xwdkjwitfafpwniffbeg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZGtqd2l0ZmFmcHduaWZmYmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMjY1MjgsImV4cCI6MjA4MjgwMjUyOH0.bV-cnKKpxI48keahMu0XsZdStnawyuJhSzvFrY7JiP0";

if (!supabaseUrl || !supabaseAnonKey) {
  // This check is kept as a safeguard, but should not be triggered with the hardcoded values.
  document.body.innerHTML = `
    <div style="font-family: 'Press Start 2P', sans-serif; background-color: #000; color: #fff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; line-height: 1.6;">
      <div style="max-width: 600px;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem; color: #e84118;">CONFIGURATION ERROR</h1>
        <p style="color: #ccc; margin-bottom: 2rem;">Your application is missing the Supabase credentials.</p>
        <div style="background: #1e1e1e; border: 1px solid #333; padding: 1.5rem; text-align: left; font-size: 0.8rem;">
           <p>Please check the values for <code>supabaseUrl</code> and <code>supabaseAnonKey</code> in <code>lib/supabaseClient.ts</code>.</p>
        </div>
      </div>
    </div>
  `;
  throw new Error("Supabase credentials are not configured. App execution halted.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
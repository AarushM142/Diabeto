import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gpnhdrsjferyxxmktmgj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbmhkcnNqZmVyeXh4bWt0bWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzIxMjIsImV4cCI6MjEwNzA0ODEyMn0.wwfqmBbKbWGLGXzA1PRRHYUAXHU5O9rMwTgWvdR9Ck0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const signInWithGoogleOAuth = async () => {
  // Clear previous session storage before redirecting to avoid stale state
  localStorage.removeItem('diabeto_user');
  localStorage.removeItem('diabeto_auth_token');
  localStorage.removeItem('diabeto_oauth_role');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }
  return data;
};

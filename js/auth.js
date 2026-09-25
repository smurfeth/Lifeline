import { supabase } from './supabaseClient.js';

// --- REGISTER SERVICE ---
export async function registerUser({ email, password, fullName, role }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  });

  return { data, error };
}

// --- LOGIN SERVICE ---
export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { data: null, error };
  }

  // Retrieve user role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role || data.user?.user_metadata?.role || 'donor';

  return { data, role, error: profileError ? null : null };
}

// --- LOGOUT SERVICE ---
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  window.location.href = 'login.html';
  return { error };
}
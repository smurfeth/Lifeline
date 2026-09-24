import { supabase } from './supabaseClient.js';

/**
 * Protects a page based on allowed roles.
 * @param {Array<string>} allowedRoles - e.g., ['staff', 'admin']
 */
export async function requireAuth(allowedRoles = []) {
  const { data: { user }, error } = await supabase.auth.getUser();

  // If no user is logged in, send them straight to login
  if (error || !user) {
    window.location.href = 'login.html';
    return null;
  }

  // Fetch the role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If role check is specified and user's role does not match, redirect to index
  if (allowedRoles.length > 0 && (!profile || !allowedRoles.includes(profile.role))) {
    alert('Access Denied: You do not have permission to view this page.');
    window.location.href = 'index.html';
    return null;
  }

  return { user, profile };
}
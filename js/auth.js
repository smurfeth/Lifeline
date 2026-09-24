import { supabase } from './supabaseClient.js';

// --- HANDLE REGISTRATION ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) {
      alert('Registration failed: ' + error.message);
    } else {
      alert('Registration successful! Please log in.');
      window.location.href = 'login.html';
    }
  });
}

// --- HANDLE LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }

    // Query user role from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      window.location.href = 'index.html';
    } else if (profile.role === 'staff' || profile.role === 'admin') {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
  });
}

// --- REUSABLE LOGOUT FUNCTION ---
export async function logoutUser() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
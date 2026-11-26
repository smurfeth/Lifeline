import { loginUser } from './auth.js';
import { supabase } from './supabaseClient.js';

const ADMIN_EMAIL = 'lifelinesystem001@gmail.com';
const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    // Check if the user selected the Admin role tab/option on the login form
    const selectedRoleEl =
      document.querySelector('input[name="role"]:checked') ||
      document.getElementById('role') ||
      document.querySelector('.role.active, .role-tab.active, [data-role].active');

    const selectedRole = selectedRoleEl
      ? (selectedRoleEl.value || selectedRoleEl.dataset.role || selectedRoleEl.textContent).trim().toLowerCase()
      : '';

    // 1. Block non-admin emails from attempting to log in under the Admin role
    if (selectedRole.includes('admin') && email !== ADMIN_EMAIL) {
      alert('Access Denied: Only lifelinesystem001@gmail.com is authorized to sign in as Admin.');
      return;
    }

    // 2. Authenticate via your existing loginUser helper
    const { data, role, error } = await loginUser({ email, password });

    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }

    const signedInEmail = (data?.user?.email || email).toLowerCase();

    // 3. Dedicated Admin login check (exclusively lifelinesystem001@gmail.com)
    if (signedInEmail === ADMIN_EMAIL) {
      localStorage.setItem('lifeline_role', 'admin');
      window.location.href = '../admin/dashboard/index.html';
      return;
    }

    // 4. Prevent any other account from escalating to 'admin' even if tagged in DB
    const userRole = (role || 'donor').toLowerCase();
    if (userRole === 'admin') {
      await supabase.auth.signOut();
      alert('Access Denied: Unauthorized admin account.');
      return;
    }

    // 5. Role-based redirection for Staff and Donor
    localStorage.setItem('lifeline_role', userRole);
    if (userRole === 'staff') {
      window.location.href = '../staff/dashboard/index.html';
    } else {
      window.location.href = '../donor/dashboard/index.html';
    }
  });
}
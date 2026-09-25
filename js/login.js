import { loginUser } from './auth.js';

const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { data, role, error } = await loginUser({ email, password });

    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }

    // Role-based redirection
    if (role === 'admin') {
      window.location.href = 'dashboard.html';
    } else if (role === 'staff') {
      window.location.href = 'staff-dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
  });
}
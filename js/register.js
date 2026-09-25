import { registerUser } from './auth.js';

const registerForm = document.getElementById('register-form');
//for users
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    const { data, error } = await registerUser({ email, password, fullName, role });

    if (error) {
      alert('Registration failed: ' + error.message);
    } else {
      alert('Registration successful! Please log in.');
      window.location.href = 'login.html';
    }
  });
}
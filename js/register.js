import { supabase } from './supabaseClient.js';

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'FIcsnHNaV5za5PTKt'; // Get this from EmailJS -> Account
const EMAILJS_SERVICE_ID = 'service_ptlq86i';
const EMAILJS_TEMPLATE_ID = 'template_4dttrr4';

if (window.emailjs && EMAILJS_PUBLIC_KEY !== 'PASTE_YOUR_PUBLIC_KEY_HERE') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form') || document.querySelector('.form');
  const alertBox = document.getElementById('signUpAlert');

  function showMessage(msg, isError = true) {
    if (!alertBox) {
      alert(msg);
      return;
    }
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
    alertBox.style.background = isError ? '#FFDAD6' : '#D1FAE5';
    alertBox.style.color = isError ? '#BA1A1A' : '#065F46';
    alertBox.style.border = isError ? '1px solid #FFB4AC' : '1px solid #A7F3D0';
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const dob = document.getElementById('dob')?.value || '';
    const sex = document.getElementById('sex')?.value || '';
    const formattedSex = sex ? (sex.charAt(0).toUpperCase() + sex.slice(1)) : 'Male';
    const email = document.getElementById('email').value.trim();
    const mobile = document.getElementById('mobile')?.value.trim() || '';
    const city = document.getElementById('city')?.value || '';
    const bloodTypeEl = document.querySelector('input[name="bloodType"]:checked');
    const bloodType = bloodTypeEl ? bloodTypeEl.value : 'unknown';
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsChecked = document.querySelector('input[name="terms"]')?.checked;

    if (!fullName || !email || !password) {
      showMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 8) {
      showMessage('Password must be at least 8 characters long.');
      return;
    }

    if (termsChecked === false) {
      showMessage('Please agree to the Lifeline Terms and Conditions.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    showMessage('Creating account and sending verification code...', false);

    try {
      // 1. Register user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: mobile,
            address: city,
            dob: dob || null,
            sex: formattedSex,
            role: 'donor',
            blood_type: bloodType !== 'unknown' ? bloodType : null
          }
        }
      });

      if (authError) throw authError;

      // 2. Sync record into public.profiles
      if (authData?.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: fullName,
          role: 'donor',
          phone: mobile || null,
          blood_type: bloodType !== 'unknown' ? bloodType : null
        });
      }

      // 3. Generate a random 6-digit OTP code & store it for verification-code/index.html
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('pending_verification_email', email);
      sessionStorage.setItem('pending_verification_name', fullName);
      sessionStorage.setItem('pending_verification_blood', bloodType !== 'unknown' ? bloodType : 'Not specified');
      sessionStorage.setItem('pending_verification_code', verificationCode);

      // 4. Send the 6-digit code via EmailJS
      if (!window.emailjs) {
        throw new Error('EmailJS SDK failed to load.');
      }

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        donor_name: fullName,
        donor_email: email,
        blood_type: bloodType !== 'unknown' ? bloodType : 'To be determined',
        verification_code: verificationCode
      });

      showMessage('Verification code sent to your email! Redirecting...', false);
      setTimeout(() => {
        window.location.href = '../verification-code/index.html';
      }, 1000);
    } catch (err) {
      console.error('Registration / Email error:', err);
      showMessage(`Error: ${err.text || err.message || String(err)}`);
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
// js/registerStaff.js — Clinical Staff Registration (1 Staff Per Hospital + EmailJS Verification)
import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';

const EMAILJS_PUBLIC_KEY = 'FIcsnHNaV5za5PTKt';
const EMAILJS_SERVICE_ID = 'service_ptlq86i';
const EMAILJS_TEMPLATE_ID = 'template_4dttrr4';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  // Locate the hospital <select> (works by ID or label fallback)
  const hospitalSelect =
    document.getElementById('hospitalSelect') ||
    document.getElementById('affiliatedHospital') ||
    Array.from(document.querySelectorAll('select')).find((s) =>
      s.innerHTML.toLowerCase().includes('healthcare institution') ||
      s.name?.toLowerCase().includes('hospital')
    );

  // 1. Load only hospitals that do not yet have an assigned staff account
  async function loadAvailableHospitals() {
    if (!hospitalSelect) return;

    const [{ data: hospitals, error }, { data: takenIds }] = await Promise.all([
      supabase.from('hospitals').select('id, name, location').order('name'),
      supabase.rpc('get_taken_hospital_ids')
    ]);

    if (error) {
      console.error('Failed to load hospitals:', error);
      showToast('Could not load hospitals: ' + error.message, 'error');
      return;
    }

    const takenSet = new Set(takenIds || []);
    const available = (hospitals || []).filter((h) => !takenSet.has(h.id));

    hospitalSelect.innerHTML =
      `<option value="">Select affiliated healthcare institution</option>` +
      available
        .map((h) => `<option value="${h.id}">${h.name} (${h.location})</option>`)
        .join('');

    if (available.length === 0) {
      hospitalSelect.innerHTML =
        `<option value="">All hospitals already have an assigned staff account</option>`;
      hospitalSelect.disabled = true;
    }
  }

  await loadAvailableHospitals();

  // 2. Wire Staff Registration Form Submission
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = (
      document.getElementById('fullName')?.value ||
      form.querySelector('input[placeholder*="Maria Clara"], input[name="fullName"]')?.value ||
      ''
    ).trim();

    const email = (
      document.getElementById('email')?.value ||
      form.querySelector('input[type="email"]')?.value ||
      ''
    ).trim();

    const passwordInputs = form.querySelectorAll('input[type="password"]');
    const password = passwordInputs[0]?.value || '';
    const confirmPassword = passwordInputs[1]?.value || password;

    const selectedHospitalId = hospitalSelect?.value || '';
    const selectedHospitalName =
      hospitalSelect?.options[hospitalSelect.selectedIndex]?.text || 'Affiliated Hospital';

    if (!fullName) {
      showToast('Please enter your full legal name.', 'error');
      return;
    }

    if (!selectedHospitalId) {
      showToast('Please select an available hospital or blood bank.', 'error');
      return;
    }

    if (!email) {
      showToast('Please enter your official institutional email.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn?.innerHTML;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Staff Account...';
    }

    try {
      // A. Create Supabase Auth user with role = 'staff' & hospital_id metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'staff',
            hospital_id: selectedHospitalId
          }
        }
      });

      if (signUpError) {
        showToast(signUpError.message, 'error');
        return;
      }

      // B. Upsert into public.profiles enforcing the 1-staff-per-hospital rule
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: fullName,
            role: 'staff',
            hospital_id: selectedHospitalId
          });

        if (profileError) {
          showToast(
            profileError.code === '23505'
              ? 'This hospital already has an assigned staff account.'
              : profileError.message,
            'error'
          );
          return;
        }
      }

      // C. Generate 6-digit verification code & send via EmailJS
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('pending_verification_email', email);
      sessionStorage.setItem('pending_verification_name', fullName);
      sessionStorage.setItem('pending_verification_blood', `Staff (${selectedHospitalName})`);
      sessionStorage.setItem('pending_verification_code', verificationCode);

      if (window.emailjs) {
        try {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            donor_name: fullName,
            donor_email: email,
            blood_type: `Clinical Staff — ${selectedHospitalName}`,
            verification_code: verificationCode
          });
        } catch (mailErr) {
          console.warn('EmailJS warning during staff signup:', mailErr);
        }
      }

      showToast('Staff account created! Redirecting to email verification...', 'success');
      setTimeout(() => {
        window.location.href = '../verification-code/index.html';
      }, 1000);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
});
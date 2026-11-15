import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify active user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    window.location.href = '../../login/index.html';
    return;
  }

  // Set default date input to tomorrow if empty
  const dateInput = document.getElementById('prefDate');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }

  // 2. Populate Card 1 (Donor Profile) & Card 2 (Facilities & Drives)
  await loadDonorProfile(user);
  await loadFacilitiesAndDrives();

  // 3. Handle Form Submission
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDonationSubmit(user.id);
    });
  }

  // 4. Wire Logout Button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '../../login/index.html';
    });
  }
});

// Auto-fill Card 1 & Pre-select Blood Type in Card 2
async function loadDonorProfile(user) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching donor profile:', error?.message);
    return;
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  };

  setText('nav-donor-name', profile.full_name || user.email);
  setText('summary-full-name', profile.full_name || 'Verified Donor');
  setText('summary-contact', profile.phone || 'Not provided');
  setText('summary-email', user.email);

  const donorIdEl = document.getElementById('summary-donor-id');
  if (donorIdEl) {
    donorIdEl.innerHTML = `#D-${user.id.slice(0, 5).toUpperCase()} <span class="material-symbols-outlined green">verified</span>`;
  }

  if (profile.blood_type) {
    setText('nav-blood-type', `Blood Type ${profile.blood_type}`);
    setText('summary-blood-type', profile.blood_type);
    setText('summary-rh-label', profile.blood_type.includes('-') ? 'Rh Negative' : 'Rh Positive');

    const bloodSelect = document.getElementById('bloodGroup');
    if (bloodSelect) bloodSelect.value = profile.blood_type;
  }
}

// Load Hospitals & Active Drives from Supabase into Card 2 Dropdowns
async function loadFacilitiesAndDrives() {
  const hospitalSelect = document.getElementById('facility');
  const driveSelect = document.getElementById('drive');

  if (hospitalSelect) {
    // Using select('*') so it works regardless of whether the address column is named location, city, or address
    const { data: hospitals, error } = await supabase
      .from('hospitals')
      .select('*');

    if (error) {
      console.error('Error loading hospitals:', error.message);
      hospitalSelect.innerHTML = `<option value="" disabled selected>Error: ${error.message}</option>`;
    } else if (hospitals && hospitals.length > 0) {
      hospitalSelect.innerHTML = '<option value="" disabled selected>Select an accredited hospital or blood bank...</option>';
      hospitals.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = h.name || h.hospital_name || 'Partner Facility';
        opt.dataset.address = h.location || h.city || h.address || 'Accredited Partner Facility';
        hospitalSelect.appendChild(opt);
      });

      // Update facility preview card when user picks a hospital
      hospitalSelect.addEventListener('change', () => {
        const selected = hospitalSelect.options[hospitalSelect.selectedIndex];
        const nameEl = document.getElementById('facility-preview-name');
        const addrEl = document.getElementById('facility-preview-address');
        if (nameEl) nameEl.innerHTML = `<span class="material-symbols-outlined red">location_on</span> ${selected.textContent}`;
        if (addrEl) addrEl.textContent = selected.dataset.address;
      });
    } else {
      hospitalSelect.innerHTML = '<option value="" disabled selected>No hospitals found in database</option>';
    }
  }

  if (driveSelect) {
    const { data: drives, error } = await supabase
      .from('donation_drives')
      .select('*');

    if (!error && drives && drives.length > 0) {
      const badge = document.getElementById('active-drives-badge');
      if (badge) badge.textContent = `${drives.length} Active Drives`;

      drives.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        const loc = d.location || d.city || d.address || '';
        opt.textContent = loc ? `${d.title} (${loc})` : d.title;
        driveSelect.appendChild(opt);
      });
    }
  }
}

// Validate & Insert Donation Request directly into Supabase
async function handleDonationSubmit(donorId) {
  // Check mandatory Card 3 health screening boxes
  const checkWeight = document.getElementById('check-weight')?.checked;
  const checkTattoo = document.getElementById('check-tattoo')?.checked;
  const checkHealth = document.getElementById('check-health')?.checked;

  if (!checkWeight || !checkTattoo || !checkHealth) {
    alert('Please confirm all three Pre-Screening Health Checklist items in Card 3 before submitting.');
    return;
  }

  // Gather Card 2 inputs matching your Supabase schema
  const bloodType = document.getElementById('bloodGroup')?.value;
  const preferredDate = document.getElementById('prefDate')?.value;
  const hospitalId = document.getElementById('facility')?.value;

  if (!hospitalId || !preferredDate) {
    alert('Please select both a Preferred Date and an Accredited Clinical Facility.');
    return;
  }

  const submitBtn = document.getElementById('submit-donation-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting to database...';
  }

  // Insert directly into Supabase `donation_records` table
  const { data, error } = await supabase
    .from('donation_records')
    .insert([
      {
        donor_id: donorId,
        hospital_id: hospitalId,
        blood_type: bloodType,
        preferred_date: preferredDate,
        status: 'pending'
      }
    ])
    .select();

  if (error) {
    console.error('Supabase insert error:', error);
    alert('Database Error: ' + error.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> Submit Donation Record';
    }
  } else {
    console.log('Inserted donation record:', data);
    alert('Donation record successfully saved to database! Redirecting to your donation history...');
    window.location.href = '../donation-history/index.html';
  }
}
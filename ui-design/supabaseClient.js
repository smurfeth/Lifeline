// Supabase Client Configuration for Lifeline
// Direct REST API integration — works with all Supabase keys (including sb_publishable_)

const SUPABASE_URL = 'https://bnytmuwgutotekaaylig.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c5fAj53uud1ud8WFRY_fxg_WOvW2kI1';

/**
 * Common headers for Supabase API requests
 */
function getHeaders(token = null) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// Session & Profile Data Management
// (Authentication sign-in and sign-up are handled directly in page scripts)
// -------------------------------------------------------------

/**
 * Sign Out
 */
async function signOutUser() {
  const token = localStorage.getItem('lifeline_token');
  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: getHeaders(token)
      });
    } catch (e) {
      console.warn('Logout request failed:', e);
    }
  }
  localStorage.removeItem('lifeline_token');
  localStorage.removeItem('lifeline_session');
  localStorage.removeItem('lifeline_user');
  localStorage.removeItem('lifeline_role');
  window.location.href = '../../login/index.html';
}

/**
 * Get current session user
 */
function getCurrentUser() {
  const user = localStorage.getItem('lifeline_user');
  return user ? JSON.parse(user) : null;
}

/**
 * Get full donor profile directly from Supabase database
 */
async function getDonorProfile() {
  const user = getCurrentUser();
  if (!user) return null;

  const metadata = user.user_metadata || {};

  // Calculate age from dob if present
  let ageString = '—';
  if (metadata.dob) {
    const birthYear = new Date(metadata.dob).getFullYear();
    const thisYear = new Date().getFullYear();
    const age = thisYear - birthYear;
    ageString = `${metadata.dob} (${age} years)`;
  }

  // 1. Fetch user's donation history from Supabase database & local records
  let allDonations = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  const token = localStorage.getItem('lifeline_token');

  if (token && user.id) {
    try {
      const dRes = await fetch(`${SUPABASE_URL}/rest/v1/donation_records?donor_id=eq.${user.id}&order=scheduled_date.desc`, {
        headers: getHeaders(token)
      });
      if (dRes.ok) {
        const dbRecords = await dRes.json();
        if (Array.isArray(dbRecords) && dbRecords.length > 0) {
          const seen = new Set(allDonations.map(d => d.record_code || d.id));
          dbRecords.forEach(r => {
            if (!seen.has(r.record_code || r.id)) {
              allDonations.push(r);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch donation records from Supabase:', e);
    }
  }

  // Filter completed donations (done donating)
  const completedDonations = allDonations.filter(d => 
    d.status && (d.status.toLowerCase() === 'completed' || d.status.toLowerCase() === 'done')
  );

  const totalDonationsCount = completedDonations.length;
  const totalMl = totalDonationsCount * 450;
  const livesImpacted = totalDonationsCount * 3;

  // 2. Calculate Medical Donation Eligibility (56 days / 8 weeks FDA & Red Cross interval)
  const DONATION_INTERVAL_DAYS = 56;
  let daysRemaining = 0;
  let nextEligibleDate = 'Eligible Today';
  let nextEligibleSub = 'Immediate Clearance';
  let isEligibleToday = true;

  if (completedDonations.length > 0) {
    // Sort latest completed donation date first
    completedDonations.sort((a, b) => {
      const dateA = new Date(a.scheduled_date || a.donation_date || a.created_at);
      const dateB = new Date(b.scheduled_date || b.donation_date || b.created_at);
      return dateB - dateA;
    });

    const latest = completedDonations[0];
    const latestDate = new Date(latest.scheduled_date || latest.donation_date || latest.created_at || new Date());
    
    // Add 56 days to the latest donation date
    const targetDate = new Date(latestDate.getTime() + DONATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    const today = new Date();

    // Normalize to midnight
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = targetMidnight - todayMidnight;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      daysRemaining = diffDays;
      isEligibleToday = false;
      nextEligibleDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      nextEligibleSub = `${daysRemaining} days remaining`;
    } else {
      daysRemaining = 0;
      isEligibleToday = true;
      nextEligibleDate = 'Eligible Today';
      nextEligibleSub = '56-day cycle complete';
    }
  }

  let tier = totalDonationsCount === 0 ? 'New Voluntary Donor' : 'Bronze Benefactor';
  let tierSub = totalDonationsCount === 0 ? '0/1 units to Bronze Badge' : `${totalDonationsCount}/5 units toward Silver`;
  if (totalDonationsCount >= 10) {
    tier = 'Gold Life Saver';
    tierSub = '10+ units completed';
  } else if (totalDonationsCount >= 5) {
    tier = 'Silver Shield';
    tierSub = `${totalDonationsCount}/10 units toward Gold`;
  }

  // Determine full name and first name cleanly
  const rawFullName = metadata.full_name || `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim() || user.email || 'Donor';
  const nameParts = rawFullName.split(' ');
  const cleanFirstName = nameParts[0] || 'Donor';

  let profile = {
    id: user.id,
    email: user.email || '',
    firstName: metadata.first_name || cleanFirstName,
    lastName: metadata.last_name || (nameParts.slice(1).join(' ') || ''),
    fullName: rawFullName,
    bloodType: metadata.blood_group || metadata.blood_type || 'O+',
    phone: metadata.phone || metadata.contact_number || '—',
    address: metadata.address || '—',
    dob: metadata.dob || '—',
    dobAge: ageString,
    sex: metadata.biological_sex || metadata.sex || '—',
    weight: metadata.weight || '—',
    donorId: `DN-${(user.id || '').replace(/[^0-9]/g, '').slice(0, 5) || '58715'}`,
    emergencyName: metadata.emergency_contact || metadata.emergency_name || 'None designated',
    emergencyRel: metadata.emergency_rel || '—',
    emergencyPhone: metadata.emergency_phone || '—',
    totalDonations: totalDonationsCount,
    totalMl: totalMl,
    livesImpacted: livesImpacted,
    tier: tier,
    tierSub: tierSub,
    nextEligibleDate: nextEligibleDate,
    nextEligibleSub: nextEligibleSub,
    daysRemaining: daysRemaining,
    isEligibleToday: isEligibleToday,
    hemoglobin: metadata.clinical_hemoglobin || 'Pending phlebotomy screening',
    bp: metadata.clinical_bp || 'Pending intake',
    pulse: metadata.clinical_pulse || 'Pending intake',
    deferral: metadata.clinical_deferral || 'Cleared for Screening'
  };

  // Fetch real data from public.profiles database table
  if (token && user.id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: getHeaders(token)
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          if (row.full_name) {
            profile.fullName = row.full_name;
            profile.firstName = row.full_name.trim().split(' ')[0] || row.full_name;
          }
          if (row.contact_number) profile.phone = row.contact_number;
          if (row.address) profile.address = row.address;
          if (row.dob) {
            profile.dob = row.dob;
            const bYear = new Date(row.dob).getFullYear();
            const age = new Date().getFullYear() - bYear;
            profile.dobAge = `${row.dob} (${age} years)`;
          }
          if (row.biological_sex) profile.sex = row.biological_sex;
          if (row.emergency_contact) profile.emergencyName = row.emergency_contact;
          if (row.blood_group) profile.bloodType = row.blood_group;
        }
      }
    } catch (e) {
      console.warn('Could not query public.profiles:', e);
    }
  }

  return profile;
}

/**
 * Update Donor profile data (for user-editable fields)
 */
async function updateDonorProfile(updates) {
  const token = localStorage.getItem('lifeline_token');
  const user = getCurrentUser();
  if (!user) return { error: { message: 'Not logged in' } };

  // 1. Update in-memory user_metadata
  const newMetadata = Object.assign({}, user.user_metadata || {}, updates);
  user.user_metadata = newMetadata;
  localStorage.setItem('lifeline_user', JSON.stringify(user));

  // 2. Persist to Supabase Auth API
  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ data: newMetadata })
      });
    } catch (err) {
      console.warn('Supabase Auth update error (persisted locally):', err);
    }

    // 3. Persist to public.profiles matching your exact table columns:
    // (full_name, contact_number, address, emergency_contact, dob, biological_sex, blood_group)
    const profilePayload = {};
    if (updates.full_name) profilePayload.full_name = updates.full_name;
    if (updates.contact_number || updates.phone) profilePayload.contact_number = updates.contact_number || updates.phone;
    if (updates.address) profilePayload.address = updates.address;
    if (updates.dob) profilePayload.dob = updates.dob;
    if (updates.biological_sex || updates.sex) profilePayload.biological_sex = updates.biological_sex || updates.sex;
    if (updates.emergency_contact || updates.emergency_name) profilePayload.emergency_contact = updates.emergency_contact || updates.emergency_name;
    if (updates.blood_group || updates.blood_type) profilePayload.blood_group = updates.blood_group || updates.blood_type;

    if (Object.keys(profilePayload).length > 0) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify(profilePayload)
        });
      } catch (profileErr) {
        console.warn('Profiles table PATCH error:', profileErr);
      }
    }
  }

  return { success: true };
}

/**
 * Automatically populates all common donor UI elements on the current page
 */
async function populateDonorUI() {
  const profile = await getDonorProfile();
  if (!profile) return null;

  // 1. Topbar user pill
  document.querySelectorAll('.user-name').forEach(el => el.textContent = profile.fullName);
  document.querySelectorAll('.user-type').forEach(el => el.textContent = `Blood Type ${profile.bloodType}`);

  // 2. Welcome greetings
  const welcomeH1 = document.querySelector('.welcome h1');
  if (welcomeH1) {
    welcomeH1.innerHTML = `Welcome back, <span class="red">${profile.firstName}!</span>`;
  }

  // 3. Welcome meta / Donor ID
  const welcomeId = document.querySelector('.welcome-id');
  if (welcomeId) {
    welcomeId.textContent = `• ID #${profile.donorId}`;
  }

  // 4. Welcome eligibility text (56-day medical interval countdown)
  const welcomeP = document.querySelector('.welcome p');
  if (welcomeP) {
    if (profile.isEligibleToday) {
      welcomeP.innerHTML = `You are eligible to donate today! Your commitment sustains real lives.`;
    } else {
      welcomeP.innerHTML = `You are eligible to donate again in <span class="red">${profile.daysRemaining} days</span> (${profile.nextEligibleDate}). Your commitment sustains real lives.`;
    }
  }

  // 5. Blood category badge / stats
  const statBigB = document.querySelector('.stat-big.red b, .stat-big b');
  if (statBigB) {
    statBigB.textContent = profile.bloodType;
  }
  const statBigSmall = document.querySelector('.stat-big.red small, .stat-big small');
  if (statBigSmall) {
    statBigSmall.textContent = profile.bloodType.includes('-') ? 'Negative' : 'Positive';
  }

  return profile;
}

/**
 * Submit a new donation appointment / record
 */
async function submitDonationRecord(record) {
  const token = localStorage.getItem('lifeline_token');
  const user = getCurrentUser();
  const recordCode = 'LL-' + Math.floor(1000 + Math.random() * 9000);

  const payload = {
    record_code: recordCode,
    donor_id: user?.id,
    blood_type: record.bloodType || 'O+',
    facility_name: record.facilityName || 'St. Jude Regional Blood Bank',
    scheduled_date: record.scheduledDate || new Date().toISOString().split('T')[0],
    slot_time: record.slotTime || '10:00 AM',
    notes: record.notes || '',
    status: 'Pending Review'
  };

  // Try inserting into Supabase donation_records
  if (token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/donation_records`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return { data: payload, error: null };
      }
    } catch (err) {
      console.warn('Supabase donation_records insert error:', err);
    }
  }

  // Also save locally so history updates immediately
  const existing = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  existing.unshift(payload);
  localStorage.setItem('lifeline_donations', JSON.stringify(existing));

  return { data: payload, error: null };
}

/**
 * Change user password in Supabase
 * @param {string} newPassword
 * @returns {Promise<{success, error}>}
 */
async function changeUserPassword(newPassword) {
  const token = localStorage.getItem('lifeline_token');
  if (!token) return { error: { message: 'Not authenticated. Please log in again.' } };

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ password: newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: { message: data.message || data.error_description || 'Failed to update password.' } };
    }

    localStorage.setItem('lifeline_pwd_changed', 'Changed just now');
    return { success: true, data };
  } catch (err) {
    console.error('Password change error:', err);
    return { error: { message: err.message || 'Network error updating password.' } };
  }
}

/**
 * Toggle Two-Factor Authentication state
 */
async function toggleTwoFactor(enable) {
  const token = localStorage.getItem('lifeline_token');
  const user = getCurrentUser();
  if (!user) return { error: { message: 'Not logged in' } };

  const newMetadata = Object.assign({}, user.user_metadata || {}, { two_factor_enabled: enable });
  user.user_metadata = newMetadata;
  localStorage.setItem('lifeline_user', JSON.stringify(user));

  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ data: { two_factor_enabled: enable } })
      });
    } catch (err) {
      console.warn('2FA update error:', err);
    }
  }

  return { success: true, enabled: enable };
}

/**
 * Automatically populates staff dashboard UI with authenticated staff profile
 */
async function populateStaffUI() {
  const user = getCurrentUser();
  if (!user) return null;

  const metadata = user.user_metadata || {};
  let fullName = metadata.full_name || 'Clinical Staff Member';
  let roleTitle = metadata.role_title || metadata.professional_role || 'Staff Medical Officer';
  let facility = metadata.facility || 'St. Jude Regional Blood Bank';

  // Check public.profiles if available
  const token = localStorage.getItem('lifeline_token');
  if (token && user.id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: getHeaders(token)
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          if (rows[0].full_name) fullName = rows[0].full_name;
        }
      }
    } catch (e) {
      console.warn('Could not query staff profile:', e);
    }
  }

  // Populate user name and title in header
  document.querySelectorAll('.user-name').forEach(el => el.textContent = fullName);
  document.querySelectorAll('.user-type').forEach(el => el.textContent = roleTitle);

  // Populate hero section
  const heroFacility = document.querySelector('.hero .chips .pill:first-child');
  if (heroFacility) {
    heroFacility.textContent = `${facility} • Transfusion Medicine Ward`;
  }
  const heroLoggedText = document.querySelector('.hero p');
  if (heroLoggedText) {
    heroLoggedText.innerHTML = `Logged in as: <b>${fullName}</b> (${roleTitle}) • Shift: 08:00 – 16:00 (Room 3B)`;
  }

  return { fullName, roleTitle, facility };
}


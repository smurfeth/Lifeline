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

/**
 * Sync official Supabase SDK session keys if lifeline_token / lifeline_user aren't set yet
 */
function syncSdkSession() {
  if (localStorage.getItem('lifeline_token') && localStorage.getItem('lifeline_user')) {
    return;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
      try {
        const sdkSession = JSON.parse(localStorage.getItem(k) || 'null');
        const sessionObj = sdkSession?.currentSession || sdkSession;
        if (sessionObj?.access_token && sessionObj?.user) {
          localStorage.setItem('lifeline_token', sessionObj.access_token);
          localStorage.setItem('lifeline_session', JSON.stringify(sessionObj));
          localStorage.setItem('lifeline_user', JSON.stringify(sessionObj.user));
          break;
        }
      } catch (e) {
        console.warn('Could not sync SDK session:', e);
      }
    }
  }
}

// -------------------------------------------------------------
// Session & Profile Data Management
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
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
      localStorage.removeItem(k);
    }
  }
  window.location.href = '../../login/index.html';
}

/**
 * Get current session user
 */
function getCurrentUser() {
  syncSdkSession();
  const user = localStorage.getItem('lifeline_user');
  return user ? JSON.parse(user) : null;
}

/**
 * Helper to format DOB + exact age
 */
function formatDobWithAge(dobStr) {
  if (!dobStr) return 'Not provided';
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return dobStr;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${dobStr} (${age} years)`;
}

/**
 * Get full donor profile directly from Supabase database
 */
async function getDonorProfile() {
  const user = getCurrentUser();
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const token = localStorage.getItem('lifeline_token');

  // 1. Fetch user's donation history from Supabase donation_records
  let allDonations = [];

  if (token && user.id) {
    try {
      const dRes = await fetch(
        `${SUPABASE_URL}/rest/v1/donation_records?donor_id=eq.${user.id}&order=preferred_date.desc`,
        { headers: getHeaders(token) }
      );
      if (dRes.ok) {
        const dbRecords = await dRes.json();
        if (Array.isArray(dbRecords)) {
          allDonations = dbRecords;
        }
      }
    } catch (e) {
      console.warn('Could not fetch donation records from Supabase:', e);
    }
  }

  // Fallback to localStorage only if database returned nothing
  if (allDonations.length === 0) {
    allDonations = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  }

  // Filter completed donations
  const completedDonations = allDonations.filter(d =>
    d.status && (d.status.toLowerCase() === 'completed' || d.status.toLowerCase() === 'done')
  );

  const totalDonationsCount = completedDonations.length;
  const totalMl = completedDonations.reduce((sum, d) => sum + (Number(d.volume_ml) || 450), 0);
  const livesImpacted = totalDonationsCount * 3;

  // 2. Calculate Medical Donation Eligibility (56 days / 8 weeks interval)
  const DONATION_INTERVAL_DAYS = 56;
  let daysRemaining = 0;
  let nextEligibleDate = 'Eligible Today';
  let nextEligibleSub = 'Immediate Clearance';
  let isEligibleToday = true;

  if (completedDonations.length > 0) {
    completedDonations.sort((a, b) => {
      const dateA = new Date(a.preferred_date || a.scheduled_date || a.donation_date || a.created_at);
      const dateB = new Date(b.preferred_date || b.scheduled_date || b.donation_date || b.created_at);
      return dateB - dateA;
    });

    const latest = completedDonations[0];
    const latestDate = new Date(latest.preferred_date || latest.scheduled_date || latest.donation_date || latest.created_at || new Date());

    const targetDate = new Date(latestDate.getTime() + DONATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    const today = new Date();

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
    phone: metadata.contact_number || metadata.phone || 'Not provided',
    address: metadata.address || 'Not provided',
    dob: metadata.dob || 'Not provided',
    dobAge: formatDobWithAge(metadata.dob),
    sex: metadata.biological_sex || metadata.sex || 'Not provided',
    weight: metadata.weight || 'Not recorded',
    donorId: `DN-${(user.id || '').replace(/[^0-9]/g, '').slice(0, 5) || '58715'}`,
    emergencyName: metadata.emergency_name || metadata.emergency_contact || 'Not yet designated',
    emergencyRel: metadata.emergency_rel || 'None',
    emergencyPhone: metadata.emergency_phone || 'None provided',
    totalDonations: totalDonationsCount,
    totalMl: totalMl,
    livesImpacted: livesImpacted,
    tier: tier,
    tierSub: tierSub,
    nextEligibleDate: nextEligibleDate,
    nextEligibleSub: nextEligibleSub,
    daysRemaining: daysRemaining,
    isEligibleToday: isEligibleToday,
    hemoglobin: null,
    bp: null,
    pulse: null,
    deferral: 'Cleared',
    notifyShortage: true,
    notifyEligibility: true,
    notifyDrives: true
  };

  // 3. Fetch real data from public.profiles database table
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
            const parts = row.full_name.trim().split(/\s+/);
            profile.firstName = parts[0] || row.full_name;
            profile.lastName = parts.slice(1).join(' ') || '';
          }
          if (row.contact_number) profile.phone = row.contact_number;
          if (row.address) profile.address = row.address;
          if (row.dob) {
            profile.dob = row.dob;
            profile.dobAge = formatDobWithAge(row.dob);
          }
          if (row.biological_sex) profile.sex = row.biological_sex;
          if (row.weight) profile.weight = row.weight;
          if (row.blood_group) profile.bloodType = row.blood_group;

          if (row.emergency_name || row.emergency_contact) {
            profile.emergencyName = row.emergency_name || row.emergency_contact;
          }
          if (row.emergency_rel) profile.emergencyRel = row.emergency_rel;
          if (row.emergency_phone) profile.emergencyPhone = row.emergency_phone;

          if (row.hemoglobin) profile.hemoglobin = row.hemoglobin;
          if (row.blood_pressure) profile.bp = row.blood_pressure;
          if (row.resting_pulse !== null && row.resting_pulse !== undefined) profile.pulse = row.resting_pulse;
          if (row.deferral_status) profile.deferral = row.deferral_status;

          if (typeof row.notify_shortage === 'boolean') profile.notifyShortage = row.notify_shortage;
          if (typeof row.notify_eligibility === 'boolean') profile.notifyEligibility = row.notify_eligibility;
          if (typeof row.notify_drives === 'boolean') profile.notifyDrives = row.notify_drives;
        }
      }
    } catch (e) {
      console.warn('Could not query public.profiles:', e);
    }
  }

  return profile;
}

/**
 * Update Donor profile data directly in public.profiles
 */
async function updateDonorProfile(updates) {
  const token = localStorage.getItem('lifeline_token');
  const user = getCurrentUser();
  if (!user) return { error: { message: 'Not logged in' } };

  // 1. Keep local user_metadata in sync
  const newMetadata = Object.assign({}, user.user_metadata || {}, updates);
  user.user_metadata = newMetadata;
  localStorage.setItem('lifeline_user', JSON.stringify(user));

  // 2. Persist to public.profiles matching exact database columns
  if (token) {
    const profilePayload = {};
    if (updates.full_name !== undefined) profilePayload.full_name = updates.full_name;
    if (updates.contact_number !== undefined || updates.phone !== undefined) {
      profilePayload.contact_number = updates.contact_number ?? updates.phone;
    }
    if (updates.address !== undefined) profilePayload.address = updates.address;
    if (updates.dob !== undefined) profilePayload.dob = updates.dob || null;
    if (updates.biological_sex !== undefined || updates.sex !== undefined) {
      profilePayload.biological_sex = updates.biological_sex ?? updates.sex;
    }
    if (updates.weight !== undefined) profilePayload.weight = updates.weight;
    if (updates.blood_group !== undefined || updates.blood_type !== undefined) {
      profilePayload.blood_group = updates.blood_group ?? updates.blood_type;
    }
    if (updates.emergency_name !== undefined || updates.emergency_contact !== undefined) {
      const emerVal = updates.emergency_name ?? updates.emergency_contact;
      profilePayload.emergency_name = emerVal;
      profilePayload.emergency_contact = emerVal;
    }
    if (updates.emergency_rel !== undefined) profilePayload.emergency_rel = updates.emergency_rel;
    if (updates.emergency_phone !== undefined) profilePayload.emergency_phone = updates.emergency_phone;
    if (updates.notify_shortage !== undefined) profilePayload.notify_shortage = Boolean(updates.notify_shortage);
    if (updates.notify_eligibility !== undefined) profilePayload.notify_eligibility = Boolean(updates.notify_eligibility);
    if (updates.notify_drives !== undefined) profilePayload.notify_drives = Boolean(updates.notify_drives);

    if (Object.keys(profilePayload).length > 0) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: Object.assign({}, getHeaders(token), { 'Prefer': 'return=representation' }),
          body: JSON.stringify(profilePayload)
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('Profiles table PATCH failed:', res.status, errText);
          return { error: { message: errText } };
        }
      } catch (profileErr) {
        console.warn('Profiles table PATCH error:', profileErr);
        return { error: profileErr };
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

  document.querySelectorAll('.user-name').forEach(el => el.textContent = profile.fullName);
  document.querySelectorAll('.user-type').forEach(el => el.textContent = `Blood Type ${profile.bloodType}`);

  const welcomeH1 = document.querySelector('.welcome h1');
  if (welcomeH1) {
    welcomeH1.innerHTML = `Welcome back, <span class="red">${profile.firstName}!</span>`;
  }

  const welcomeId = document.querySelector('.welcome-id');
  if (welcomeId) {
    welcomeId.textContent = `• ID #${profile.donorId}`;
  }

  const welcomeP = document.querySelector('.welcome p');
  if (welcomeP) {
    if (profile.isEligibleToday) {
      welcomeP.innerHTML = `You are eligible to donate today! Your commitment sustains real lives.`;
    } else {
      welcomeP.innerHTML = `You are eligible to donate again in <span class="red">${profile.daysRemaining} days</span> (${profile.nextEligibleDate}). Your commitment sustains real lives.`;
    }
  }

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

  const existing = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  existing.unshift(payload);
  localStorage.setItem('lifeline_donations', JSON.stringify(existing));

  return { data: payload, error: null };
}

/**
 * Change user password in Supabase
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

  document.querySelectorAll('.user-name').forEach(el => el.textContent = fullName);
  document.querySelectorAll('.user-type').forEach(el => el.textContent = roleTitle);

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
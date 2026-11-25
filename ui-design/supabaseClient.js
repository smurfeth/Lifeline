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
<<<<<<< HEAD
 * Compute official Lifeline Donor Badge tier & analytics from successful donations count
 */
function getDonorBadgeInfo(count) {
  const n = Number(count) || 0;
  if (n >= 26) {
    return {
      tier: 'Diamond Donor',
      tierSub: `${n} successful donations completed (Highest Tier)`,
      nextTarget: n,
      progressLabel: `${n} / 26+`,
      percent: 100,
      badgeBg: '#EDE9FE',
      badgeColor: '#6D28D9'
    };
  }
  if (n >= 13) {
    return {
      tier: 'Platinum Donor',
      tierSub: `${n}/26 successful donations toward Diamond Donor`,
      nextTarget: 26,
      progressLabel: `${n} / 26`,
      percent: Math.round((n / 26) * 100),
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1'
    };
  }
  if (n >= 7) {
    return {
      tier: 'Gold Donor',
      tierSub: `${n}/13 successful donations toward Platinum Donor`,
      nextTarget: 13,
      progressLabel: `${n} / 13`,
      percent: Math.round((n / 13) * 100),
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309'
    };
  }
  if (n >= 4) {
    return {
      tier: 'Silver Donor',
      tierSub: `${n}/7 successful donations toward Gold Donor`,
      nextTarget: 7,
      progressLabel: `${n} / 7`,
      percent: Math.round((n / 7) * 100),
      badgeBg: '#F1F5F9',
      badgeColor: '#475569'
    };
  }
  if (n >= 1) {
    return {
      tier: 'Bronze Donor',
      tierSub: `${n}/4 successful donations toward Silver Donor`,
      nextTarget: 4,
      progressLabel: `${n} / 4`,
      percent: Math.round((n / 4) * 100),
      badgeBg: '#FFEDD5',
      badgeColor: '#9A3412'
    };
  }
  return {
    tier: 'New Voluntary Donor',
    tierSub: '0/1 successful donations toward Bronze Donor',
    nextTarget: 1,
    progressLabel: '0 / 1',
    percent: 0,
    badgeBg: '#F3F4F6',
    badgeColor: '#6B7280'
  };
=======
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
>>>>>>> origin/main
}

/**
 * Get full donor profile directly from Supabase database
 */
async function getDonorProfile() {
  const user = getCurrentUser();
  if (!user) return null;

  const metadata = user.user_metadata || {};
<<<<<<< HEAD

  // Calculate age from dob if present
  let ageString = '—';
  if (metadata.dob) {
    const birthYear = new Date(metadata.dob).getFullYear();
    const thisYear = new Date().getFullYear();
    const age = thisYear - birthYear;
    ageString = `${metadata.dob} (${age} years)`;
  }

  // 1. Fetch user's donation history from Supabase database & local records (strictly scoped to this user.id)
  const rawLocalDonations = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  let allDonations = rawLocalDonations.filter(d => d.donor_id && d.donor_id === user.id);
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
          // Prefer authoritative Supabase records and merge any unsynced local records for this user
          const seen = new Set(dbRecords.map(r => r.record_code || r.id));
          const unsyncedLocal = allDonations.filter(d => !seen.has(d.record_code || d.id));
          allDonations = [...dbRecords, ...unsyncedLocal];
=======
          allDonations = dbRecords;
>>>>>>> origin/main
        }
      }
    } catch (e) {
      console.warn('Could not fetch donation records from Supabase:', e);
    }
  }

<<<<<<< HEAD
  // Filter completed donations (done donating) and pending reviews
  const completedDonations = allDonations.filter(d => 
=======
  // Fallback to localStorage only if database returned nothing
  if (allDonations.length === 0) {
    allDonations = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  }

  // Filter completed donations
  const completedDonations = allDonations.filter(d =>
>>>>>>> origin/main
    d.status && (d.status.toLowerCase() === 'completed' || d.status.toLowerCase() === 'done')
  );
  const pendingDonations = allDonations.filter(d =>
    d.status && d.status.toLowerCase().includes('pending')
  );

  const totalDonationsCount = completedDonations.length;
<<<<<<< HEAD
  const pendingDonationsCount = pendingDonations.length;
  const totalMl = completedDonations.reduce((sum, d) => {
    if (d.blood_collected_ml !== undefined && d.blood_collected_ml !== null) {
      return sum + (Number(d.blood_collected_ml) || 0);
    }
    const match = (d.notes || '').match(/Collected:\s*(\d+)\s*mL/i);
    return sum + (match ? parseInt(match[1], 10) : 450);
  }, 0);
=======
  const totalMl = completedDonations.reduce((sum, d) => sum + (Number(d.volume_ml) || 450), 0);
>>>>>>> origin/main
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

  const badgeInfo = getDonorBadgeInfo(totalDonationsCount);
  const tier = badgeInfo.tier;
  const tierSub = badgeInfo.tierSub;

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
    pendingDonations: pendingDonationsCount,
    totalMl: totalMl,
    livesImpacted: livesImpacted,
    tier: tier,
    tierSub: tierSub,
    tierProgressLabel: badgeInfo.progressLabel,
    tierPercent: badgeInfo.percent,
    badgeBg: badgeInfo.badgeBg,
    badgeColor: badgeInfo.badgeColor,
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
<<<<<<< HEAD
}


/**
 * Universal Notification Bell initializer for Donor, Staff, and Admin pages.
 * Automatically activates on any page with .icon-btn.bell that doesn't already have #notifPanel or [data-feed].
 */
async function initUniversalNotifications() {
  const bellBtn = document.querySelector('.icon-btn.bell');
  if (!bellBtn) return;
  if (document.getElementById('notifPanel')) return;
  if (bellBtn.hasAttribute('data-feed')) return;

  // Inject styles once
  if (!document.getElementById('lifeline-notif-styles')) {
    const style = document.createElement('style');
    style.id = 'lifeline-notif-styles';
    style.textContent = `
      .notif-panel {
        position: absolute; top: calc(var(--topbar-h, 64px) - 4px); right: 60px;
        width: 380px; max-height: 480px; background: #fff; border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.05);
        border: 1px solid #EFE6E3; z-index: 250; overflow: hidden;
        animation: notifSlideIn 0.2s ease-out;
      }
      @keyframes notifSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      .notif-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 12px; border-bottom:1px solid #EFE6E3; }
      .notif-header h3 { font-family:'Montserrat',sans-serif; font-size:16px; font-weight:700; color:#1E1B19; margin:0; }
      .notif-clear { background:none; border:none; font-size:12px; font-weight:600; color:#B7131A; cursor:pointer; }
      .notif-clear:hover { text-decoration:underline; }
      .notif-list { max-height:400px; overflow-y:auto; padding:8px 0; }
      .notif-item { display:flex; align-items:flex-start; gap:12px; padding:14px 20px; border-bottom:1px solid rgba(239,230,227,0.5); position:relative; cursor:pointer; }
      .notif-item:last-child { border-bottom:none; }
      .notif-item:hover { background:#FBF2EE; }
      .notif-item.unread { background:rgba(183,19,26,0.03); }
      .notif-item.unread::before { content:''; position:absolute; left:8px; top:50%; transform:translateY(-50%); width:6px; height:6px; border-radius:50%; background:#B7131A; }
      .notif-icon { flex-shrink:0; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:10px; }
      .notif-icon.green { background:#D1FAE5; color:#059669; }
      .notif-icon.red   { background:#FFDAD6; color:#B7131A; }
      .notif-icon.amber { background:#FEF3C7; color:#F59E0B; }
      .notif-icon.blue  { background:#DBEAFE; color:#2563EB; }
      .notif-body { flex:1; min-width:0; }
      .notif-title { font-size:13px; font-weight:600; color:#1E1B19; line-height:1.3; }
      .notif-desc { font-size:12px; color:#5B403D; line-height:1.4; margin-top:2px; }
      .notif-time { font-size:11px; color:#9CA3AF; margin-top:4px; font-weight:500; }
      @media (max-width:600px) { .notif-panel { right:8px; left:8px; width:auto; } }
    `;
    document.head.appendChild(style);
  }

  // Detect portal role from path
  const path = window.location.pathname.toLowerCase();
  const portal = path.includes('/admin/') ? 'admin' : path.includes('/staff/') ? 'staff' : 'donor';
  const readKey = `lifeline_${portal}_notif_read`;

  // Inject dropdown DOM
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.id = 'notifPanel';
  panel.style.display = 'none';
  const headerTitle = portal === 'admin' ? 'Admin Notifications' : portal === 'staff' ? 'Staff Notifications' : 'Notifications';
  panel.innerHTML = `
    <div class="notif-header">
      <h3>${headerTitle}</h3>
      <button type="button" id="markAllRead" class="notif-clear">Mark all read</button>
    </div>
    <div class="notif-list" id="notifList"></div>
  `;
  bellBtn.insertAdjacentElement('afterend', panel);

  const bellDot = bellBtn.querySelector('.bell-dot');
  const notifList = panel.querySelector('#notifList');
  const markAllReadBtn = panel.querySelector('#markAllRead');

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display !== 'none' ? 'none' : 'block';
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
      panel.style.display = 'none';
    }
  });

  async function buildNotifications() {
    const items = [];
    if (portal === 'donor') {
      const profile = await getDonorProfile();
      if (profile) {
        if (profile.isEligibleToday) {
          items.push({ icon: 'check_circle', color: 'green', title: 'You are eligible to donate!', desc: 'Your 56-day recovery period is complete. You can schedule a donation.', time: 'Eligibility', href: '../submit-donation/index.html', unread: true });
        } else {
          items.push({ icon: 'schedule', color: 'blue', title: `${profile.daysRemaining} days until next eligible date`, desc: `Next donation window opens on ${profile.nextEligibleDate}.`, time: '56-Day Cycle', href: '../dashboard/index.html', unread: profile.daysRemaining <= 7 });
        }
        items.push({ icon: 'military_tech', color: 'amber', title: `Badge: ${profile.tier}`, desc: profile.tierSub, time: 'Milestone', href: '../profile/index.html', unread: false });
      }
      const drives = JSON.parse(localStorage.getItem('lifeline_drives') || '[]').filter(d => d.status === 'Published' || d.status === 'Ongoing');
      if (drives.length > 0) {
        items.push({ icon: 'event_available', color: 'red', title: `${drives.length} Active Donation Drive${drives.length > 1 ? 's' : ''}`, desc: `Latest: ${drives[0].title} at ${drives[0].venue || drives[0].facility}.`, time: 'Open for Application', href: '../donation-drives/index.html', unread: true });
      }
      items.push({ icon: 'favorite', color: 'green', title: 'Pre-donation reminder', desc: 'Drink extra water, eat iron-rich meals, and bring a valid photo ID.', time: 'Health Tip', unread: false });
    } else if (portal === 'staff') {
      const reviews = JSON.parse(localStorage.getItem('lifeline_staff_reviews') || '[]').filter(r => r.status === 'Pending Review');
      const apps = JSON.parse(localStorage.getItem('lifeline_drive_applications') || '[]').filter(a => a.status === 'Pending');
      items.push({ icon: 'pending_actions', color: 'amber', title: `${reviews.length} Pending Donor Review${reviews.length === 1 ? '' : 's'}`, desc: 'Donor intake submissions awaiting clinical screening and volume logging.', time: 'Review Queue', href: '../pending-reviews/index.html', unread: reviews.length > 0 });
      items.push({ icon: 'event_available', color: 'blue', title: `${apps.length} Pending Drive Application${apps.length === 1 ? '' : 's'}`, desc: 'Review and approve donor applications for published drives.', time: 'Donation Drives', href: '../donation-drives/index.html', unread: apps.length > 0 });
      items.push({ icon: 'warning', color: 'red', title: 'Critical Shortage: O- & Platelets', desc: 'O- Universal Donor and Platelet reserves require urgent replenishment.', time: 'Freezer Vault #4', href: '../dashboard/index.html', unread: true });
    } else {
      // Admin portal
      const drives = JSON.parse(localStorage.getItem('lifeline_drives') || '[]');
      const published = drives.filter(d => d.status === 'Published' || d.status === 'Ongoing').length;
      const apps = JSON.parse(localStorage.getItem('lifeline_drive_applications') || '[]').length;
      items.push({ icon: 'campaign', color: 'blue', title: `${published} Active Donation Drive${published === 1 ? '' : 's'} Network-Wide`, desc: `${apps} total donor applications tracked across regional drives.`, time: 'Network Drives', href: '../donation-drives/index.html', unread: true });
      items.push({ icon: 'local_hospital', color: 'amber', title: 'Partner Facility Compliance', desc: 'Monitor hospital & blood bank accreditation and cold-chain status.', time: 'Facilities', href: '../hospitals-blood-banks/index.html', unread: true });
      items.push({ icon: 'warning', color: 'red', title: 'Regional O- Reserve Alert', desc: 'O- supply below target threshold at regional trauma centers.', time: 'System Alert', href: '../dashboard/index.html', unread: false });
    }
    return items;
  }

  let cachedItems = [];
  async function render() {
    cachedItems = await buildNotifications();
    const readSet = JSON.parse(localStorage.getItem(readKey) || '[]');
    const unreadCount = cachedItems.filter((n, i) => n.unread && !readSet.includes(i)).length;
    if (bellDot) bellDot.style.display = unreadCount > 0 ? 'block' : 'none';

    notifList.innerHTML = cachedItems.map((n, i) => `
      <div class="notif-item ${n.unread && !readSet.includes(i) ? 'unread' : ''}" data-href="${n.href || ''}">
        <div class="notif-icon ${n.color}"><span class="material-symbols-outlined">${n.icon}</span></div>
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.desc}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `).join('');

    notifList.querySelectorAll('.notif-item[data-href]').forEach(el => {
      const href = el.getAttribute('data-href');
      if (href) el.addEventListener('click', () => { window.location.href = href; });
    });
  }

  markAllReadBtn.addEventListener('click', () => {
    localStorage.setItem(readKey, JSON.stringify(cachedItems.map((_, i) => i)));
    render();
  });

  await render();
}

document.addEventListener('DOMContentLoaded', () => {
  initUniversalNotifications();
});
=======
}
>>>>>>> origin/main

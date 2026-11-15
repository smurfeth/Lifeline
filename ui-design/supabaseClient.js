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
// Authentication Helpers
// -------------------------------------------------------------

/**
 * Sign In with Email & Password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{data, error}>}
 */
async function signInUser(email, password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email: email.trim(),
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        data: null, 
        error: { message: data.error_description || data.msg || data.message || 'Invalid email or password.' } 
      };
    }

    // Save session info
    if (data.access_token) {
      localStorage.setItem('lifeline_token', data.access_token);
      localStorage.setItem('lifeline_session', JSON.stringify(data));
      localStorage.setItem('lifeline_user', JSON.stringify(data.user));
      
      const role = data.user?.user_metadata?.role || 'donor';
      localStorage.setItem('lifeline_role', role);
    }

    return { data, error: null };
  } catch (err) {
    console.error('Sign in error:', err);
    return { data: null, error: { message: err.message || 'Network error connecting to Supabase.' } };
  }
}

/**
 * Sign Up a new Donor
 * @param {object} donorData 
 * @returns {Promise<{data, error}>}
 */
async function signUpDonor({ email, password, fullName, firstName, lastName, bloodType, phone, address, dob, sex }) {
  try {
    const finalFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
    const formattedSex = sex ? (sex.charAt(0).toUpperCase() + sex.slice(1)) : 'Male';

    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email: email.trim(),
        password: password,
        data: {
          full_name: finalFullName,
          first_name: firstName,
          last_name: lastName,
          contact_number: phone,
          phone: phone,
          address: address,
          dob: dob || null,
          biological_sex: formattedSex,
          sex: formattedSex,
          role: 'donor',
          blood_group: bloodType,
          blood_type: bloodType
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        data: null, 
        error: { message: data.error_description || data.msg || data.message || 'Registration failed.' } 
      };
    }

    // If auto-logged in, save session
    if (data.access_token) {
      localStorage.setItem('lifeline_token', data.access_token);
      localStorage.setItem('lifeline_session', JSON.stringify(data));
      localStorage.setItem('lifeline_user', JSON.stringify(data.user));
      localStorage.setItem('lifeline_role', 'donor');
    }

    // Direct PATCH to public.profiles table matching your exact database columns:
    // (id, full_name, role, contact_number, address, emergency_contact, dob, biological_sex, blood_group)
    if (data.user && data.access_token) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}`, {
          method: 'PATCH',
          headers: getHeaders(data.access_token),
          body: JSON.stringify({
            full_name: finalFullName,
            contact_number: phone,
            address: address,
            dob: dob || null,
            biological_sex: formattedSex,
            blood_group: bloodType !== 'unknown' ? bloodType : null
          })
        });
      } catch (profileErr) {
        console.warn('Profile table sync optional/skipped:', profileErr);
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Sign up error:', err);
    return { data: null, error: { message: err.message || 'Network error connecting to Supabase.' } };
  }
}

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
 * Get full donor profile (from DB or user session)
 */
async function getDonorProfile() {
  const user = getCurrentUser();
  if (!user) return null;

  const metadata = user.user_metadata || {};

  // Calculate age from dob if present
  let ageString = 'Age not specified';
  if (metadata.dob) {
    const birthYear = new Date(metadata.dob).getFullYear();
    const thisYear = new Date().getFullYear();
    const age = thisYear - birthYear;
    ageString = `${metadata.dob} (${age} years)`;
  }

  // Count user's donations
  const localDonations = JSON.parse(localStorage.getItem('lifeline_donations') || '[]');
  const completedDonations = localDonations.filter(d => d.status === 'Completed').length;
  const totalDonationsCount = completedDonations; // 0 for new donors
  const totalMl = totalDonationsCount * 450;
  const livesImpacted = totalDonationsCount * 3;

  let tier = 'New Voluntary Donor';
  let tierSub = '0/1 units to Bronze Badge';
  if (totalDonationsCount >= 10) {
    tier = 'Gold Life Saver';
    tierSub = '10+ units completed';
  } else if (totalDonationsCount >= 5) {
    tier = 'Silver Shield';
    tierSub = `${totalDonationsCount}/10 units toward Gold`;
  } else if (totalDonationsCount >= 1) {
    tier = 'Bronze Benefactor';
    tierSub = `${totalDonationsCount}/5 units toward Silver`;
  }

  const nextEligibleDate = totalDonationsCount === 0 ? 'Eligible Today' : 'Cycle Reset Active';
  const nextEligibleSub = totalDonationsCount === 0 ? 'Immediate Clearance' : 'Schedule your appointment';

  let profile = {
    id: user.id,
    email: user.email || '',
    firstName: metadata.first_name || (user.email ? user.email.split('@')[0] : 'Donor'),
    lastName: metadata.last_name || '',
    fullName: metadata.full_name || `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim() || user.email,
    bloodType: metadata.blood_type || 'O+',
    phone: metadata.phone || '+63 900 000 0000',
    address: metadata.address || 'Cebu City, Philippines',
    dob: metadata.dob || 'Not provided',
    dobAge: ageString,
    sex: metadata.sex ? (metadata.sex.charAt(0).toUpperCase() + metadata.sex.slice(1)) : 'Male',
    weight: metadata.weight || 'Pending Clinical Intake',
    donorId: `DN-${(user.id || '99420').replace(/[^0-9]/g, '').slice(0, 5) || '88210'}`,
    emergencyName: metadata.emergency_name || 'Not yet designated',
    emergencyRel: metadata.emergency_rel || 'None',
    emergencyPhone: metadata.emergency_phone || 'None provided',
    totalDonations: totalDonationsCount,
    totalMl: totalMl,
    livesImpacted: livesImpacted,
    tier: tier,
    tierSub: tierSub,
    nextEligibleDate: nextEligibleDate,
    nextEligibleSub: nextEligibleSub,
    hemoglobin: metadata.clinical_hemoglobin || 'Pending Initial Phlebotomy Screening',
    bp: metadata.clinical_bp || 'Pending Intake',
    pulse: metadata.clinical_pulse || 'Pending Intake',
    deferral: metadata.clinical_deferral || 'Cleared for Screening'
  };

  // Try fetching from public.profiles table if user has a token
  const token = localStorage.getItem('lifeline_token');
  if (token && user.id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: getHeaders(token)
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          if (row.full_name) profile.fullName = row.full_name;
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

          // Auto-Sync: If database columns in public.profiles are NULL (e.g. Apollo's row),
          // sync them immediately from metadata/localStorage!
          const missingFields = {};
          if (!row.contact_number && profile.phone && profile.phone !== '+63 900 000 0000') {
            missingFields.contact_number = profile.phone;
          }
          if (!row.address && profile.address) {
            missingFields.address = profile.address;
          }
          if (!row.dob && profile.dob && profile.dob !== 'Not provided') {
            missingFields.dob = profile.dob;
          }
          if (!row.biological_sex && profile.sex) {
            missingFields.biological_sex = profile.sex;
          }
          if (!row.blood_group && profile.bloodType) {
            missingFields.blood_group = profile.bloodType;
          }

          if (Object.keys(missingFields).length > 0) {
            fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
              method: 'PATCH',
              headers: getHeaders(token),
              body: JSON.stringify(missingFields)
            }).then(() => console.log('Successfully auto-synced fields to Supabase profiles:', missingFields));
          }
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

  // 4. Blood category badge / stats
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


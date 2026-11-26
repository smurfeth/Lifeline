// js/staffPendingReviews.js — Live Staff Clinical Intake, Status Verification & EmailJS Alerts
import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';

const EMAILJS_PUBLIC_KEY = 'FIcsnHNaV5za5PTKt';
const EMAILJS_SERVICE_ID = 'service_ptlq86i';
const EMAILJS_STATUS_TEMPLATE_ID = 'YOUR_NEW_STATUS_TEMPLATE_ID'; // Replace with your EmailJS status template ID

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize EmailJS if SDK is loaded
  if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  // 1. Verify active Supabase session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    window.location.href = '../../login/index.html';
    return;
  }

  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('full_name, role, hospital_id')
    .eq('id', user.id)
    .single();

  const navStaffName = document.getElementById('navStaffName');
  if (navStaffName) {
    navStaffName.textContent =
      staffProfile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
  }

  let allRecords = [];
  let profileMap = {};
  let hospitalMap = {};
  let selectedRecordId = new URLSearchParams(window.location.search).get('id') || null;
  let currentTab = 'all';

  // 2. Fetch live records, donor profiles, and hospitals from Supabase
  async function loadQueueData() {
    let recordsQuery = supabase
      .from('donation_records')
      .select('*')
      .order('created_at', { ascending: false });

    // Scope to assigned hospital if logged in as staff
    if (staffProfile?.role === 'staff' && staffProfile?.hospital_id) {
      recordsQuery = recordsQuery.eq('hospital_id', staffProfile.hospital_id);
    }

    const [recordsRes, profilesRes, hospitalsRes] = await Promise.all([
      recordsQuery,
      supabase.from('profiles').select('*'),
      supabase.from('hospitals').select('*')
    ]);

    if (recordsRes.error) {
      console.error('Failed to load records:', recordsRes.error);
      showToast('Error loading clinical queue: ' + recordsRes.error.message, 'error');
      return;
    }

    allRecords = recordsRes.data || [];

    profileMap = {};
    (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });

    hospitalMap = {};
    (hospitalsRes.data || []).forEach((h) => { hospitalMap[h.id] = h; });

    updateKPIs();
    renderQueue();
  }

  // 3. Update KPI Cards from real database counts
  function updateKPIs() {
    const pending = allRecords.filter(
      (r) => (r.status || '').trim().toLowerCase() === 'pending'
    );
    const approved = allRecords.filter(
      (r) => (r.status || '').trim().toLowerCase() === 'approved'
    );
    const completed = allRecords.filter(
      (r) => (r.status || '').trim().toLowerCase() === 'completed'
    );
    const urgent = [...pending, ...approved].filter((r) => {
      const donor = profileMap[r.donor_id] || {};
      const bt = (r.blood_type || donor.blood_type || '').toUpperCase();
      return bt === 'O-' || bt === 'AB-';
    });

    const totalMl = completed.length * 450;

    document.getElementById('kpiPendingCount').innerHTML =
      `${pending.length} <small>donors</small>`;
    document.getElementById('kpiUrgentCount').innerHTML =
      `${urgent.length} <span class="pill pill-red">Urgent / O-</span>`;
    document.getElementById('kpiApprovedCount').innerHTML =
      `${approved.length} <small>cleared</small>`;
    document.getElementById('kpiDoneCount').innerHTML =
      `${completed.length} <small>donations</small>`;
    document.getElementById('kpiDoneVol').textContent =
      `${totalMl.toLocaleString()} mL collected`;
  }

  // Helper: map DB status to readable label & badge class
  function formatStatusBadge(rawStatus) {
    const st = (rawStatus || 'pending').trim().toLowerCase();
    if (st === 'completed') return { label: 'COMPLETED', cls: 'pill-green' };
    if (st === 'approved') return { label: 'APPROVED', cls: 'pill-green' };
    if (st === 'rejected' || st === 'cancelled') {
      return { label: st === 'rejected' ? 'REJECTED' : 'CANCELLED', cls: 'pill-red' };
    }
    return { label: 'PENDING REVIEW', cls: 'pill-amber' };
  }

  // 4. Render Submissions List
  function renderQueue() {
    const query = (
      document.getElementById('queueSearch')?.value ||
      document.getElementById('topSearchInput')?.value ||
      ''
    )
      .trim()
      .toLowerCase();

    const bloodFilter = document.getElementById('bloodFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    const filtered = allRecords.filter((rec) => {
      const st = (rec.status || 'pending').trim().toLowerCase();
      const donor = profileMap[rec.donor_id] || {};
      const donorName = (donor.full_name || 'Registered Donor').toLowerCase();
      const bt = (rec.blood_type || donor.blood_type || '').toUpperCase();
      const recCode = `ll-${rec.id.slice(0, 4).toLowerCase()}`;

      // Tab filter
      if (currentTab === 'pending' && st !== 'pending') return false;
      if (currentTab === 'approved' && st !== 'approved') return false;
      if (currentTab === 'done' && st !== 'completed') return false;
      if (currentTab === 'all' && (st === 'cancelled' || st === 'rejected')) return false;

      if (bloodFilter !== 'all' && bt !== bloodFilter) return false;
      if (statusFilter !== 'all' && st !== statusFilter) return false;

      if (query) {
        const phone = (donor.contact_number || donor.phone || '').toLowerCase();
        if (
          !donorName.includes(query) &&
          !recCode.includes(query) &&
          !phone.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });

    const badgeEl = document.getElementById('queueListBadge');
    if (badgeEl) badgeEl.textContent = filtered.length;

    const container = document.getElementById('submissionsList');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card pad" style="text-align:center; color:#64748B;">
          No donor submissions match the selected filters.
        </div>
      `;
      clearDetailPanel();
      return;
    }

    if (!selectedRecordId || !filtered.some((r) => r.id === selectedRecordId)) {
      selectedRecordId = filtered[0].id;
    }

    container.innerHTML = filtered
      .map((rec) => {
        const donor = profileMap[rec.donor_id] || {};
        const donorName = donor.full_name || 'Registered Donor';
        const bt = (rec.blood_type || donor.blood_type || '—').toUpperCase();
        const recCode = `#LL-${rec.id.slice(0, 4).toUpperCase()}`;
        const hospName = hospitalMap[rec.hospital_id]?.name || 'Accredited Blood Bank';
        const isSelected = rec.id === selectedRecordId;
        const isUrgent = bt === 'O-' || bt === 'AB-';
        const stInfo = formatStatusBadge(rec.status);

        return `
          <article class="submission ${isUrgent ? 'urgent' : ''} ${isSelected ? 'selected' : ''}" data-rec-id="${rec.id}">
            <div class="left">
              <div class="bgbox">${bt}<small>TYPE</small></div>
              <div>
                <b>${donorName}</b>
                <span class="pill">${recCode}</span>
                <span class="pill ${stInfo.cls}">${stInfo.label}</span>
                <div class="meta">
                  <span>Date: ${rec.preferred_date || 'N/A'}</span>
                  <span>Facility: ${hospName}</span>
                </div>
              </div>
            </div>
            <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-gray'}" type="button" data-select-id="${rec.id}">
              Review &gt;
            </button>
          </article>
        `;
      })
      .join('');

    container.querySelectorAll('[data-select-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedRecordId = btn.getAttribute('data-select-id');
        renderQueue();
        document.getElementById('detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    const activeRec = allRecords.find((r) => r.id === selectedRecordId);
    if (activeRec) populateDetail(activeRec);
  }

  function clearDetailPanel() {
    document.getElementById('detInitials').textContent = '--';
    document.getElementById('detName').textContent = 'No submission selected';
    document.getElementById('detBlood').textContent = '--';
    document.getElementById('detSubMeta').textContent = 'Adjust filters or wait for new donor submissions';
    document.getElementById('detIdBadge').textContent = 'ID: --';
    document.getElementById('detPhone').textContent = '-';
    document.getElementById('detEmail').textContent = '-';
    document.getElementById('detEmerName').textContent = '-';
    document.getElementById('detEmerPhone').textContent = '-';
  }

  // 5. Populate Right/Bottom Detail Panel with Real Donor & Record Data
  function populateDetail(rec) {
    const donor = profileMap[rec.donor_id] || {};
    const donorName = donor.full_name || 'Registered Donor';
    const initials = donorName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const bt = (rec.blood_type || donor.blood_type || '—').toUpperCase();
    const recCode = `#LL-${rec.id.slice(0, 4).toUpperCase()}`;
    const hospName = hospitalMap[rec.hospital_id]?.name || 'Accredited Blood Bank';
    const rawStatus = (rec.status || 'pending').trim().toLowerCase();

    document.getElementById('detInitials').textContent = initials;
    document.getElementById('detName').textContent = donorName;
    document.getElementById('detBlood').textContent = bt;
    document.getElementById('detSubMeta').textContent =
      `Scheduled: ${rec.preferred_date || 'N/A'} • Facility: ${hospName}`;
    document.getElementById('detIdBadge').textContent = `Record ${recCode}`;

    // Completed donations badge for this donor
    const donorCompletedCount = allRecords.filter(
      (r) =>
        r.donor_id === rec.donor_id &&
        (r.status || '').trim().toLowerCase() === 'completed'
    ).length;

    const donorBadge = document.getElementById('detDonorBadge');
    if (donorBadge) {
      donorBadge.textContent = `${donorCompletedCount} Completed Donation${donorCompletedCount === 1 ? '' : 's'}`;
    }

    // Read-only donor info from profiles table + live Auth email lookup
    document.getElementById('detPhone').textContent =
      donor.contact_number || donor.phone || 'Not provided';
    document.getElementById('detEmail').textContent = 'Loading email...';
    document.getElementById('detEmerName').textContent =
      donor.emergency_contact || donor.emergency_contact_name || 'Not on file';
    document.getElementById('detEmerPhone').textContent =
      donor.address || donor.emergency_contact_phone || '—';

    if (rec.donor_id) {
      supabase.rpc('get_donor_email', { target_user_id: rec.donor_id }).then(({ data }) => {
        const emailEl = document.getElementById('detEmail');
        if (emailEl && selectedRecordId === rec.id) {
          emailEl.textContent = data || 'No email on file';
        }
      });
    }

    // Status dropdown & pill
    const statusSelect = document.getElementById('editDonationStatus');
    if (statusSelect) {
      statusSelect.value = ['pending', 'approved', 'completed', 'rejected'].includes(rawStatus)
        ? rawStatus
        : 'pending';
    }

    const stInfo = formatStatusBadge(rawStatus);
    const statusPill = document.getElementById('detStatusPill');
    if (statusPill) {
      statusPill.textContent = stInfo.label;
      statusPill.className = `pill ${stInfo.cls}`;
    }
  }

  // 6. Transactional EmailJS Alert Helper (fetches donor email from auth.users via RPC)
  async function sendDonorStatusEmail(rec, donor, newStatus) {
    if (!window.emailjs || !rec?.donor_id) return;
    if (newStatus !== 'approved' && newStatus !== 'completed') return;
    if (!EMAILJS_STATUS_TEMPLATE_ID || EMAILJS_STATUS_TEMPLATE_ID === 'YOUR_NEW_STATUS_TEMPLATE_ID') {
      console.warn('EmailJS status template ID not configured yet.');
      return;
    }

    const { data: donorEmail, error: emailLookupError } = await supabase.rpc(
      'get_donor_email',
      { target_user_id: rec.donor_id }
    );

    if (emailLookupError || !donorEmail) {
      console.warn('Could not retrieve donor email from Auth:', emailLookupError);
      return;
    }

    const isApproved = newStatus === 'approved';
    const recCode = `#LL-${rec.id.slice(0, 4).toUpperCase()}`;
    const hospName = hospitalMap[rec.hospital_id]?.name || 'Accredited Blood Bank';
    const collectedMl = document.getElementById('editBloodVolume')?.value || '450';

    const templateParams = {
      donor_name: donor.full_name || 'Valued Donor',
      donor_email: donorEmail,
      record_code: recCode,
      hospital_name: hospName,
      blood_type: rec.blood_type || donor.blood_type || 'Not specified',
      scheduled_date: rec.preferred_date || 'Scheduled Appointment',
      status_label: isApproved ? 'Approved for Collection' : 'Donation Completed',
      status_message: isApproved
        ? 'Please arrive 15 minutes before your scheduled window and bring a valid government-issued photo ID.'
        : `${collectedMl} mL of blood has been recorded in your clinical history. Remember to stay hydrated and rest for the next 24 hours.`
    };

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_STATUS_TEMPLATE_ID, templateParams);
      showToast(`Email notification sent to ${donorEmail}.`, 'info');
    } catch (err) {
      console.warn('EmailJS status alert failed:', err);
    }
  }

  // 7. Persist Status Update to public.donation_records in Supabase
  async function updateRecordStatus(newStatus) {
    if (!selectedRecordId) {
      showToast('Please select a donor submission first.', 'error');
      return;
    }

    const rec = allRecords.find((r) => r.id === selectedRecordId);
    const donor = profileMap[rec?.donor_id] || {};
    const donorName = donor.full_name || 'Donor';

    const { error } = await supabase
      .from('donation_records')
      .update({ status: newStatus })
      .eq('id', selectedRecordId);

    if (error) {
      console.error('Supabase status update error:', error);
      showToast('Failed to update record status: ' + error.message, 'error');
      return;
    }

    const labelMap = {
      pending: 'Pending Review',
      approved: 'Approved for Collection',
      completed: 'Completed (Unit Recorded)',
      rejected: 'Rejected / Deferred'
    };

    showToast(
      `${donorName}'s submission updated to ${labelMap[newStatus] || newStatus}.`,
      newStatus === 'rejected' ? 'info' : 'success'
    );

    if (rec && (newStatus === 'approved' || newStatus === 'completed')) {
      await sendDonorStatusEmail(rec, donor, newStatus);
    }

    await loadQueueData();
  }

  // Wire Action Buttons
  document.getElementById('btnApproveSubmission')?.addEventListener('click', () => {
    updateRecordStatus('approved');
  });

  document.getElementById('btnMarkDone')?.addEventListener('click', () => {
    updateRecordStatus('completed');
  });

  document.getElementById('btnSaveClinical')?.addEventListener('click', () => {
    const chosenStatus = document.getElementById('editDonationStatus')?.value || 'pending';
    updateRecordStatus(chosenStatus);
  });

  document.getElementById('btnDefer')?.addEventListener('click', () => {
    updateRecordStatus('rejected');
  });

  document.getElementById('btnAutoFillVitals')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('editBp').value = '120/80';
    document.getElementById('editHb').value = '14.0';
    document.getElementById('editWeight').value = '62';
    document.getElementById('editTemp').value = '36.6';
    showToast('Normal clinical baseline vitals populated.', 'info');
  });

  // Wire Volume Preset Chips
  document.querySelectorAll('.vol-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.vol-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const volInput = document.getElementById('editBloodVolume');
      if (volInput) volInput.value = chip.dataset.vol;
    });
  });

  // Wire Filters & Tabs
  document.getElementById('queueSearch')?.addEventListener('input', renderQueue);
  document.getElementById('topSearchInput')?.addEventListener('input', renderQueue);
  document.getElementById('bloodFilter')?.addEventListener('change', renderQueue);
  document.getElementById('statusFilter')?.addEventListener('change', renderQueue);

  document.querySelectorAll('#donorTypeTabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#donorTypeTabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderQueue();
    });
  });

  document.getElementById('btnFastTrackO')?.addEventListener('click', () => {
    const bf = document.getElementById('bloodFilter');
    if (bf) bf.value = 'O-';
    renderQueue();
    showToast('Filtered queue to O- Universal Donors.', 'info');
  });

  document.getElementById('btnSyncRegistry')?.addEventListener('click', async () => {
    await loadQueueData();
    showToast('Synced with live Supabase donor registry.', 'success');
  });

  // Wire Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '../../login/index.html';
    });
  }

  // Initial Load
  await loadQueueData();
});
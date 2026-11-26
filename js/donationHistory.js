// js/donationHistory.js — Live Donor History, Filters & Cancel Submission
import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify active Supabase session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    window.location.href = '../../login/index.html';
    return;
  }

  // 2. Load donor profile for topbar pill & fallback blood type
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const fullName = profileRow?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
  const donorBloodType = profileRow?.blood_type || user.user_metadata?.blood_type || '—';

  const navNameEl = document.getElementById('navDonorName');
  const navTypeEl = document.getElementById('navDonorType');
  if (navNameEl) navNameEl.textContent = fullName;
  if (navTypeEl) navTypeEl.textContent = donorBloodType !== '—' ? `Blood Type ${donorBloodType}` : 'Donor';

  // 3. Load hospitals map so hospital names resolve cleanly
  const { data: hospitals } = await supabase.from('hospitals').select('*');
  const hospitalMap = {};
  if (hospitals) {
    hospitals.forEach((h) => { hospitalMap[h.id] = h; });
  }

  let allRecords = [];

  // 4. Fetch donor's real records from Supabase
  async function loadRecords() {
    const { data: records, error } = await supabase
      .from('donation_records')
      .select('*')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load donation history:', error);
      showToast('Unable to load donation history: ' + error.message, 'error');
      return;
    }

    allRecords = records || [];
    updateSummaryStats();
    populateYearFilters();
    renderFilteredRecords();
  }

  // 5. Update Hero Stats & 56-Day Deferral Banner
  function updateSummaryStats() {
    const completed = allRecords.filter(
      (r) => (r.status || '').trim().toLowerCase() === 'completed'
    );

    const totalDonations = completed.length;
    const totalMl = totalDonations * 450;
    const livesSaved = totalDonations * 3;

    const mlEl = document.getElementById('heroTotalMl');
    const countEl = document.getElementById('heroDonationsCount');
    const livesEl = document.getElementById('heroLivesSaved');

    if (mlEl) mlEl.textContent = totalMl.toLocaleString();
    if (countEl) countEl.textContent = totalDonations;
    if (livesEl) livesEl.textContent = livesSaved;

    // 56-Day Deferral Banner calculation
    const bannerPill = document.getElementById('deferralBannerPill');
    const bannerTitle = document.getElementById('deferralBannerTitle');
    const bannerDesc = document.getElementById('deferralBannerDesc');

    if (completed.length > 0) {
      const latestDate = new Date(completed[0].preferred_date || completed[0].created_at);
      const nextDate = new Date(latestDate);
      nextDate.setDate(nextDate.getDate() + 56);
      const today = new Date();

      if (nextDate > today) {
        const formattedNext = nextDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        if (bannerTitle) bannerTitle.textContent = '56-Day Deferral Tracking Active';
        if (bannerDesc) {
          bannerDesc.textContent =
            'Your clinical recuperation period is strictly maintained for safe red-cell replenishment.';
        }
        if (bannerPill) bannerPill.textContent = `Next Safe Whole Blood: ${formattedNext}`;
      } else {
        if (bannerTitle) bannerTitle.textContent = 'Eligible for Whole Blood Donation';
        if (bannerDesc) {
          bannerDesc.textContent =
            'Your 56-day recovery period is complete. You are cleared to schedule your next donation.';
        }
        if (bannerPill) bannerPill.textContent = 'Cleared to Donate Today';
      }
    } else {
      if (bannerTitle) bannerTitle.textContent = 'Ready for Your First Donation';
      if (bannerDesc) {
        bannerDesc.textContent =
          'No 56-day deferral active. You are eligible to submit a blood donation request anytime.';
      }
      if (bannerPill) bannerPill.textContent = 'Cleared to Donate Today';
    }
  }

  // 6. Dynamically build year filter radio chips from the user's actual records
  function populateYearFilters() {
    const yearGroup = document.getElementById('yearFilterGroup');
    if (!yearGroup) return;

    const years = Array.from(
      new Set(
        allRecords
          .map((r) => {
            const d = new Date(r.preferred_date || r.created_at);
            return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
          })
          .filter(Boolean)
      )
    ).sort((a, b) => Number(b) - Number(a));

    const yearRadios = years
      .map(
        (yr) => `
        <input type="radio" name="yr" id="yr-${yr}" value="${yr}" class="sr">
        <label for="yr-${yr}" class="chip">Year ${yr}</label>
      `
      )
      .join('');

    yearGroup.innerHTML = `
      <input type="radio" name="yr" id="yr-all" value="all" class="sr" checked>
      <label for="yr-all" class="chip">All Years</label>
      ${yearRadios}
    `;

    yearGroup.querySelectorAll('input[name="yr"]').forEach((radio) => {
      radio.addEventListener('change', renderFilteredRecords);
    });
  }

  // 7. Render matching records & wire View Details + Cancel Submission buttons
  function renderFilteredRecords() {
    const logsContainer = document.getElementById('logsContainer');
    const showingCountEl = document.getElementById('showingCount');
    const totalCountEl = document.getElementById('totalLogsCount');
    if (!logsContainer) return;

    const selectedStatus =
      document.querySelector('input[name="st"]:checked')?.value || 'all';
    const selectedYear =
      document.querySelector('input[name="yr"]:checked')?.value || 'all';
    const searchQuery = (
      document.getElementById('historySearchInput')?.value || ''
    )
      .trim()
      .toLowerCase();

    const filtered = allRecords.filter((rec) => {
      const rawStatus = (rec.status || 'pending').trim().toLowerCase();
      const normalizedStatus = rawStatus === 'approved' ? 'pending' : rawStatus;

      if (selectedStatus !== 'all' && normalizedStatus !== selectedStatus) {
        return false;
      }

      const d = new Date(rec.preferred_date || rec.created_at);
      const recYear = Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
      if (selectedYear !== 'all' && recYear !== selectedYear) {
        return false;
      }

      if (searchQuery) {
        const hospName = (hospitalMap[rec.hospital_id]?.name || '').toLowerCase();
        const code = `#ll-${rec.id.slice(0, 4).toLowerCase()}`;
        const dateStr = (rec.preferred_date || '').toLowerCase();
        if (
          !hospName.includes(searchQuery) &&
          !code.includes(searchQuery) &&
          !dateStr.includes(searchQuery)
        ) {
          return false;
        }
      }

      return true;
    });

    if (showingCountEl) showingCountEl.textContent = filtered.length;
    if (totalCountEl) totalCountEl.textContent = allRecords.length;

    if (filtered.length === 0) {
      logsContainer.innerHTML = `
        <div class="empty card pad" style="display:flex;">
          <span class="material-symbols-outlined">search_off</span>
          <strong>No donation records found</strong>
          <span>${
            allRecords.length === 0
              ? 'You have not submitted any blood donation records yet.'
              : 'Try selecting a different status or year filter.'
          }</span>
        </div>
      `;
      return;
    }

    logsContainer.innerHTML = filtered
      .map((rec) => {
        const recCode = `LL-${rec.id.slice(0, 4).toUpperCase()}`;
        const rawStatus = (rec.status || 'pending').trim().toLowerCase();
        const isPending = rawStatus === 'pending';
        const isApproved = rawStatus === 'approved';
        const isCompleted = rawStatus === 'completed';
        const isCancelled = rawStatus === 'cancelled' || rawStatus === 'rejected';

        const statusClass = isCompleted
          ? 'completed'
          : isCancelled
          ? 'cancelled'
          : 'pending';

        const statusPill = isCompleted
          ? `<span class="pill-green-soft"><span class="material-symbols-outlined">check_circle</span>Completed</span>`
          : isApproved
          ? `<span class="pill-green-soft"><span class="material-symbols-outlined">verified</span>Approved</span>`
          : isCancelled
          ? `<span class="pill-cancelled" style="display:inline-flex;"><span class="material-symbols-outlined">cancel</span>${
              rawStatus === 'rejected' ? 'Declined' : 'Cancelled'
            }</span>`
          : `<span class="pill-amber"><span class="material-symbols-outlined">pending_actions</span>Pending Review</span>`;

        const hospName =
          hospitalMap[rec.hospital_id]?.name ||
          rec.hospital_name ||
          'Accredited Blood Bank';

        const formattedDate = rec.preferred_date
          ? new Date(rec.preferred_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Date Not Set';

        const bType = rec.blood_type || donorBloodType;
        const volumeLine = isCompleted
          ? `Volume: <b class="green">450 mL</b> <s>&bull;</s> <span class="material-symbols-outlined green">verified_user</span> Verified Clinical Record`
          : isCancelled
          ? `Submission withdrawn before staff review.`
          : `Volume: <i>Pending Staff Verification upon reception</i>`;

        return `
          <article class="card pad log ${statusClass}" data-record-id="${rec.id}">
            <input type="checkbox" class="sr ab" id="a-${rec.id}">
            <input type="checkbox" class="sr vb" id="v-${rec.id}">

            <div class="log-top">
              <div class="log-main">
                <div class="type"><b>${bType}</b><small>Type</small></div>
                <div class="log-info">
                  <div class="log-title">
                    <h2>Record #${recCode}</h2>
                    ${statusPill}
                  </div>
                  <p class="log-line">
                    <span class="material-symbols-outlined">calendar_today</span>
                    <b>${formattedDate}</b>
                    <s>&bull;</s>
                    <span class="material-symbols-outlined">local_hospital</span>
                    <span>${hospName}</span>
                  </p>
                  <p class="log-line sub">${volumeLine}</p>
                </div>
              </div>

              <div class="log-actions">
                <label class="btn btn-sm btn-light" for="v-${rec.id}">
                  <span class="material-symbols-outlined">visibility</span>
                  <span class="lbl-show">View Details</span>
                  <span class="lbl-hide">Hide Details</span>
                </label>
                ${
                  isPending
                    ? `<label class="btn btn-sm btn-light danger ask-btn" for="a-${rec.id}">
                         <span class="material-symbols-outlined">block</span>Cancel Submission
                       </label>`
                    : ''
                }
              </div>
            </div>

            ${
              isPending
                ? `<div class="log-ask">
                     <span>Withdraw this submission before staff review? This can't be undone.</span>
                     <label class="btn btn-sm btn-light" for="a-${rec.id}">Keep record</label>
                     <button type="button" class="btn btn-sm btn-light danger confirm-cancel-btn" data-id="${rec.id}">
                       Yes, cancel submission
                     </button>
                   </div>`
                : ''
            }

            <dl class="log-extra">
              <div><dt>Record ID</dt><dd>#${recCode}</dd></div>
              <div><dt>Status</dt><dd style="text-transform:capitalize;">${rawStatus}</dd></div>
              <div><dt>Blood Type</dt><dd>${bType}</dd></div>
              <div><dt>Scheduled Date</dt><dd>${formattedDate}</dd></div>
              <div><dt>Facility</dt><dd>${hospName}</dd></div>
              <div><dt>Volume</dt><dd>${isCompleted ? '450 mL' : 'Pending verification'}</dd></div>
            </dl>
          </article>
        `;
      })
      .join('');

    // Wire "Yes, cancel submission" buttons
    logsContainer.querySelectorAll('.confirm-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const recordId = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Cancelling...';

        // Try updating status to 'cancelled'; if enum doesn't allow 'cancelled', delete pending row
        let { error } = await supabase
          .from('donation_records')
          .update({ status: 'cancelled' })
          .eq('id', recordId)
          .eq('donor_id', user.id);

        if (error && error.message && error.message.toLowerCase().includes('invalid input value for enum')) {
          const delRes = await supabase
            .from('donation_records')
            .delete()
            .eq('id', recordId)
            .eq('donor_id', user.id);
          error = delRes.error;
        }

        if (error) {
          console.error('Cancel failed:', error);
          showToast('Failed to cancel submission: ' + error.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Yes, cancel submission';
          return;
        }

        showToast('Donation submission has been cancelled.', 'success');
        await loadRecords();
      });
    });
  }

  // Wire status filter radios & search bar
  document.querySelectorAll('input[name="st"]').forEach((radio) => {
    radio.addEventListener('change', renderFilteredRecords);
  });

  const searchInput = document.getElementById('historySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderFilteredRecords);
  }

  // Wire logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '../../login/index.html';
    });
  }

  // Initial load
  await loadRecords();
});
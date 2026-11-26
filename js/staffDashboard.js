// js/staffDashboard.js — Live Staff Dashboard Overview & Triage Queue
import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify active Supabase session & staff/admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    window.location.href = '../../login/index.html';
    return;
  }

  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const staffName =
    staffProfile?.full_name ||
    user.user_metadata?.full_name ||
    user.email.split('@')[0];

  const navNameEl = document.getElementById('navStaffName');
  const heroOfficerEl = document.getElementById('heroStaffName');
  if (navNameEl) navNameEl.textContent = staffName;
  if (heroOfficerEl) heroOfficerEl.textContent = staffName;

  // 2. Fetch live records, donor profiles, hospitals, and donation drives
  const [recordsRes, profilesRes, hospitalsRes, drivesRes] = await Promise.all([
    supabase
      .from('donation_records')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, blood_type, phone, address'),
    supabase.from('hospitals').select('id, name, location'),
    supabase.from('donation_drives').select('*')
  ]);

  if (recordsRes.error) {
    console.error('Error loading facility records:', recordsRes.error);
    showToast('Failed to load donation records: ' + recordsRes.error.message, 'error');
  }

  const allRecords = recordsRes.data || [];
  const allDrives = drivesRes.data || [];

  const profileMap = {};
  (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });

  const hospitalMap = {};
  (hospitalsRes.data || []).forEach((h) => { hospitalMap[h.id] = h; });

  // 3. Compute real counts from public.donation_records & public.donation_drives
  const pendingRecords = allRecords.filter(
    (r) => (r.status || '').trim().toLowerCase() === 'pending'
  );
  const approvedRecords = allRecords.filter(
    (r) => (r.status || '').trim().toLowerCase() === 'approved'
  );
  const completedRecords = allRecords.filter(
    (r) => (r.status || '').trim().toLowerCase() === 'completed'
  );

  const totalMl = completedRecords.length * 450;

  // Update Hero & KPI Cards
  const heroPendingCount = document.getElementById('heroPendingCount');
  if (heroPendingCount) heroPendingCount.textContent = pendingRecords.length;

  const kpiTotalRecords = document.getElementById('kpiTotalRecords');
  const kpiActiveDrives = document.getElementById('kpiActiveDrives');
  const kpiPendingCount = document.getElementById('kpiPendingCount');
  const kpiApprovedCount = document.getElementById('kpiApprovedCount');
  const kpiCompletedCount = document.getElementById('kpiCompletedCount');
  const kpiCompletedMl = document.getElementById('kpiCompletedMl');

  if (kpiTotalRecords) kpiTotalRecords.textContent = allRecords.length.toLocaleString();
  if (kpiActiveDrives) {
    kpiActiveDrives.textContent = `${allDrives.length} active donation drive${allDrives.length === 1 ? '' : 's'}`;
  }
  if (kpiPendingCount) kpiPendingCount.textContent = pendingRecords.length;
  if (kpiApprovedCount) kpiApprovedCount.textContent = approvedRecords.length;
  if (kpiCompletedCount) kpiCompletedCount.textContent = completedRecords.length;
  if (kpiCompletedMl) kpiCompletedMl.textContent = `${totalMl.toLocaleString()} mL processed`;

  // 4. Render Immediate Clinical Verification Table (real pending/approved records)
  let currentQueueFilter = 'all';

  function renderVerificationTable() {
    const tbody = document.getElementById('verificationTableBody');
    const footerCount = document.getElementById('tableFootSummary');
    const tabAllBtn = document.getElementById('tabQueueAll');
    const tabPendingBtn = document.getElementById('tabQueuePending');
    const tabUrgentBtn = document.getElementById('tabQueueUrgent');

    const actionable = allRecords.filter((r) => {
      const st = (r.status || '').trim().toLowerCase();
      return st === 'pending' || st === 'approved';
    });

    if (tabAllBtn) tabAllBtn.textContent = `All (${actionable.length})`;
    if (tabPendingBtn) tabPendingBtn.textContent = `Pending (${pendingRecords.length})`;

    const urgentList = actionable.filter((r) => {
      const donor = profileMap[r.donor_id] || {};
      const bt = (r.blood_type || donor.blood_type || '').toUpperCase();
      return bt === 'O-' || bt === 'AB-';
    });
    if (tabUrgentBtn) tabUrgentBtn.textContent = `Urgent / Rare (${urgentList.length})`;

    const rowsToShow = actionable.filter((r) => {
      const st = (r.status || '').trim().toLowerCase();
      const donor = profileMap[r.donor_id] || {};
      const bt = (r.blood_type || donor.blood_type || '').toUpperCase();

      if (currentQueueFilter === 'pending') return st === 'pending';
      if (currentQueueFilter === 'urgent') return bt === 'O-' || bt === 'AB-';
      return true;
    });

    if (footerCount) {
      footerCount.textContent = `Showing ${Math.min(rowsToShow.length, 8)} of ${actionable.length} active clinical submissions`;
    }

    if (!tbody) return;

    if (rowsToShow.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 28px; color: #64748B;">
            No active submissions waiting in this queue.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rowsToShow
      .slice(0, 8)
      .map((rec) => {
        const donor = profileMap[rec.donor_id] || {};
        const donorName = donor.full_name || 'Registered Donor';
        const initials = donorName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const bloodType = rec.blood_type || donor.blood_type || '—';
        const recCode = `#LL-${rec.id.slice(0, 4).toUpperCase()}`;
        const hospName = hospitalMap[rec.hospital_id]?.name || 'Accredited Facility';
        const st = (rec.status || 'pending').trim().toLowerCase();
        const isApproved = st === 'approved';

        const formattedDate = rec.preferred_date
          ? new Date(rec.preferred_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Unscheduled';

        return `
          <tr>
            <td>
              <div class="person">
                <span class="ini ${bloodType === 'O-' ? 'red' : ''}">${initials}</span>
                <div>
                  <b>${donorName}</b>
                  <small>Record ${recCode} &bull; ${hospName}</small>
                </div>
              </div>
            </td>
            <td><span class="bloodtype ${bloodType === 'O-' ? 'fill' : ''}">${bloodType}</span></td>
            <td>
              <b>${formattedDate}</b>
              <small>${hospName}</small>
            </td>
            <td>
              <span class="pill ${isApproved ? 'pill-green' : 'pill-amber'}">
                ${isApproved ? 'APPROVED FOR COLLECTION' : 'PENDING REVIEW'}
              </span>
            </td>
            <td class="right">
              <a class="btn btn-primary btn-sm" href="../pending-reviews/index.html?id=${rec.id}">
                Review &amp; Verify
              </a>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  renderVerificationTable();

  // Wire queue filter tabs
  document.querySelectorAll('[data-queue-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('[data-queue-filter]')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentQueueFilter = btn.getAttribute('data-queue-filter');
      renderVerificationTable();
    });
  });

  // 5. Render Storage Reserves dynamically from completed donation_records
  const reservesContainer = document.getElementById('storageReservesList');
  if (reservesContainer) {
    const groups = [
      { code: 'O-', label: 'Universal Donor (O-)' },
      { code: 'O+', label: 'Positive Universal (O+)' },
      { code: 'A+', label: 'Type A Positive (A+)' },
      { code: 'B+', label: 'Type B Positive (B+)' }
    ];

    reservesContainer.innerHTML = groups
      .map((g) => {
        const unitCount = completedRecords.filter((r) => {
          const donor = profileMap[r.donor_id] || {};
          const bt = (r.blood_type || donor.blood_type || '').toUpperCase();
          return bt === g.code;
        }).length;

        const isLow = unitCount < 3;
        const barWidth = Math.min(100, Math.max(8, unitCount * 15));

        return `
          <div class="reserve">
            <div class="reserve-row">
              <div class="person">
                <span class="bloodtype ${isLow ? 'fill' : ''}">${g.code}</span>
                <div>
                  <b>${g.label}</b>
                  <small class="${isLow ? 'danger-text' : ''}">
                    ${isLow ? 'Low Reserve' : 'Verified Stock'} (${unitCount} Unit${unitCount === 1 ? '' : 's'})
                  </small>
                </div>
              </div>
              <span class="pill ${isLow ? 'pill-red' : ''}">${isLow ? 'Priority Need' : 'Active'}</span>
            </div>
            <div class="bar ${isLow ? 'crit' : 'green'}"><span style="width: ${barWidth}%"></span></div>
          </div>
        `;
      })
      .join('');
  }

  // 6. Staff Notification Bell Dropdown (from real Supabase counts)
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const bellDot = document.getElementById('bellDot');
  const notifList = document.getElementById('notifList');
  const markAllReadBtn = document.getElementById('markAllRead');

  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifPanel.style.display !== 'none';
      notifPanel.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
        notifPanel.style.display = 'none';
      }
    });
  }

  function renderStaffNotifications() {
    if (!notifList) return;
    const notifications = [];

    if (pendingRecords.length > 0) {
      const latest = pendingRecords[0];
      const latestDonor = profileMap[latest.donor_id]?.full_name || 'Donor';
      notifications.push({
        icon: 'pending_actions',
        color: 'amber',
        title: `${pendingRecords.length} Pending Donor Verification${pendingRecords.length > 1 ? 's' : ''}`,
        desc: `Latest: ${latestDonor} (#LL-${latest.id.slice(0, 4).toUpperCase()}) awaiting clinical screening.`,
        time: 'Action Required',
        href: '../pending-reviews/index.html',
        unread: true
      });
    }

    if (approvedRecords.length > 0) {
      notifications.push({
        icon: 'water_drop',
        color: 'blue',
        title: `${approvedRecords.length} Approved Collection${approvedRecords.length > 1 ? 's' : ''} Ready`,
        desc: 'Cleared donors awaiting blood collection completion.',
        time: 'Phlebotomy Queue',
        href: '../pending-reviews/index.html',
        unread: true
      });
    }

    notifications.push({
      icon: 'event_available',
      color: 'green',
      title: `${allDrives.length} Active Donation Drive${allDrives.length === 1 ? '' : 's'}`,
      desc: 'View scheduled mobile and hospital blood drives.',
      time: 'Facility Schedule',
      href: '../donation-drives/index.html',
      unread: false
    });

    const readSet = JSON.parse(localStorage.getItem('lifeline_staff_notif_read') || '[]');
    const unreadCount = notifications.filter((n, i) => n.unread && !readSet.includes(i)).length;

    if (bellDot) bellDot.style.display = unreadCount > 0 ? 'block' : 'none';

    notifList.innerHTML = notifications
      .map(
        (n, i) => `
        <div class="notif-item ${n.unread && !readSet.includes(i) ? 'unread' : ''}" data-href="${n.href}">
          <div class="notif-icon ${n.color}">
            <span class="material-symbols-outlined">${n.icon}</span>
          </div>
          <div class="notif-body">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `
      )
      .join('');

    notifList.querySelectorAll('.notif-item[data-href]').forEach((item) => {
      item.addEventListener('click', () => {
        window.location.href = item.getAttribute('data-href');
      });
    });
  }

  renderStaffNotifications();

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      const count = notifList?.querySelectorAll('.notif-item').length || 0;
      localStorage.setItem(
        'lifeline_staff_notif_read',
        JSON.stringify(Array.from({ length: count }, (_, i) => i))
      );
      renderStaffNotifications();
    });
  }

  // 7. Wire Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '../../login/index.html';
    });
  }
});
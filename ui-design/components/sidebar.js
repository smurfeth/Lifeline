/**
 * Lifeline - Universal Slide-out Sidebar & Hamburger Button Component
 * Dynamically mounts a floating hamburger trigger and role-aware navigation drawer
 */
(function() {
  function initLifelineSidebar() {
    // Determine current role based on URL pathname
    const path = window.location.pathname.toLowerCase().replace(/\\/g, '/');
    let currentRole = 'donor';
    if (path.includes('/staff/')) currentRole = 'staff';
    else if (path.includes('/admin/')) currentRole = 'admin';

    // Role metadata definitions
    const roles = {
      donor: {
        badge: 'VOLUNTARY DONOR',
        color: '#006947',
        links: [
          { name: 'Dashboard', url: '../dashboard/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' },
          { name: 'Submit Donation', url: '../submit-donation/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' },
          { name: 'Donation History', url: '../donation-history/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>' },
          { name: 'Donation Drives', url: '../donation-drives/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' },
          { name: 'Profile', url: '../profile/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' }
        ]
      },
      staff: {
        badge: 'STAFF OPERATIONS',
        color: '#E53935',
        links: [
          { name: 'Dashboard', url: '../dashboard/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' },
          { name: 'Donation Records', url: '../donation-records/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>' },
          { name: 'Pending Reviews', url: '../pending-reviews/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' },
          { name: 'Donation Drives', url: '../donation-drives/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' },
          { name: 'Facility Profile', url: '../facility-profile/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>' }
        ]
      },
      admin: {
        badge: 'ADMIN COMMAND',
        color: '#6366F1',
        links: [
          { name: 'Dashboard', url: '../dashboard/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' },
          { name: 'Hospitals & Blood Banks', url: '../hospitals-blood-banks/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>' },
          { name: 'Donation Drives', url: '../donation-drives/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' }
        ]
      }
    };

    const currentConfig = roles[currentRole] || roles.donor;

    // Create Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'lifeline-sidebar-backdrop';

    // Build Nav Links HTML
    const navLinksHtml = currentConfig.links.map(link => {
      // Check if current page matches link url
      const slug = link.url.replace('../', '').replace('/index.html', '');
      const isActive = path.includes('/' + slug + '/');
      return `
        <a href="${link.url}" class="lifeline-drawer-link ${isActive ? 'active' : ''}">
          <span class="lifeline-drawer-link-icon">${link.icon}</span>
          <span>${link.name}</span>
        </a>
      `;
    }).join('');

    // Cross-portal navigation relative links
    const donorDashUrl = currentRole === 'donor' ? '../dashboard/index.html' : (currentRole === 'staff' ? '../../donor/dashboard/index.html' : '../../donor/dashboard/index.html');
    const staffDashUrl = currentRole === 'staff' ? '../dashboard/index.html' : (currentRole === 'donor' ? '../../staff/dashboard/index.html' : '../../staff/dashboard/index.html');
    const adminDashUrl = currentRole === 'admin' ? '../dashboard/index.html' : (currentRole === 'donor' ? '../../admin/dashboard/index.html' : '../../admin/dashboard/index.html');

    // Create Drawer Panel
    const drawer = document.createElement('aside');
    drawer.className = 'lifeline-sidebar-drawer';
    drawer.innerHTML = `
      <div>
        <div class="lifeline-drawer-header">
          <a href="${currentConfig.links[0].url}" class="lifeline-drawer-brand">
            <div class="lifeline-drawer-logo">
              <img src="../../login/assets/lifeline-logo.jpg" onerror="this.src='https://placehold.co/40x40?text=LL'" alt="Lifeline">
            </div>
            <div>
              <div class="lifeline-drawer-brand-text">
                <span class="life">LIFE</span><span class="line">LINE</span>
              </div>
              <div class="lifeline-drawer-tagline">— Your Blood. Their Hope —</div>
            </div>
          </a>
          <button class="lifeline-drawer-close-btn" id="lifelineCloseDrawerBtn" aria-label="Close navigation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="lifeline-drawer-role-badge">
          <span style="display:inline-block; width:6px; height:6px; border-radius:9999px; background:${currentConfig.color};"></span>
          <span>${currentConfig.badge}</span>
        </div>

        <nav class="lifeline-drawer-nav">
          ${navLinksHtml}
        </nav>

        <div class="lifeline-role-switcher">
          <div class="lifeline-role-switcher-title">Switch Portal</div>
          <div class="lifeline-role-switcher-btns">
            <a href="${donorDashUrl}" class="lifeline-role-pill ${currentRole === 'donor' ? 'current' : ''}">Donor</a>
            <a href="${staffDashUrl}" class="lifeline-role-pill ${currentRole === 'staff' ? 'current' : ''}">Staff</a>
            <a href="${adminDashUrl}" class="lifeline-role-pill ${currentRole === 'admin' ? 'current' : ''}">Admin</a>
          </div>
        </div>
      </div>

      <div class="lifeline-drawer-footer">
        <a href="../../login/index.html" class="lifeline-drawer-logout-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span>Log Out</span>
        </a>
      </div>
    `;

    // Append elements to document body
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Toggle logic
    function openDrawer() {
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    backdrop.addEventListener('click', closeDrawer);

    const closeBtn = drawer.querySelector('#lifelineCloseDrawerBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Fix the page's absolute navbar to be position:fixed so it always stays at top
    // The Figma export has the navbar as position:absolute inside the root div.
    // We inject a style to override it to fixed.
    const navbarStyle = document.createElement('style');
    navbarStyle.textContent = `
      /* Fix absolute navbar to be fixed at top */
      div[style*="position: absolute"][style*="backdrop-filter: blur(12px)"],
      div[style*="position: absolute"][style*="backdrop-filter:blur(12px)"] {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        z-index: 1000 !important;
        box-sizing: border-box !important;
      }
    `;
    (document.head || document.body).appendChild(navbarStyle);

    // Wire the existing inline hamburger icon in page headers to open the drawer.
    // The Figma hamburger is: div[style*="width: 18px"][style*="height: 12px"][style*="background: #5B403D"]
    // inside a padding:8px container which is the clickable area.
    function wireHamburgerIcon() {
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach(el => {
        const s = el.getAttribute('style') || '';
        // Match the 18x12 hamburger bar placeholder in the Figma export
        if (
          (s.includes('width: 18px') && s.includes('height: 12px')) ||
          (s.includes('width: 18.33px') && s.includes('height: 12px')) ||
          (s.includes('width: 18px') && s.includes('height: 12.67px'))
        ) {
          // Walk up to find the immediate clickable wrapper (the padding:8px container)
          let btn = el;
          for (let i = 0; i < 4; i++) {
            if (!btn.parentElement) break;
            btn = btn.parentElement;
            const ps = btn.getAttribute('style') || '';
            if (ps.includes('padding: 8px') || ps.includes('padding:8px') || ps.includes('border-radius: 8px')) {
              break;
            }
          }
          if (!btn._lifelineWired) {
            btn._lifelineWired = true;
            btn.style.cursor = 'pointer';
            btn.setAttribute('title', 'Open Navigation Menu');
            btn.setAttribute('role', 'button');
            btn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              openDrawer();
            });
          }
        }
      });
    }

    wireHamburgerIcon();

    // Toast helper
    function showToast(msg, type = 'info') {
      let toast = document.getElementById('lifelineToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lifelineToast';
        toast.className = 'lifeline-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.className = `lifeline-toast is-${type} show`;
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2800);
    }

    // Auto-wire buttons across the page content for seamless prototype navigation
    function wirePageActions() {
      const allElements = document.querySelectorAll('div, button, a, span');
      allElements.forEach(el => {
        // Skip inside drawer or hamburger
        if (el.closest('.lifeline-sidebar-drawer') || el.closest('.lifeline-hamburger-btn')) return;
        
        const text = (el.textContent || '').trim().toLowerCase();
        if (!text || text.length > 40) return;

        // Make sure we only bind on leaf elements or small wrappers
        if (el.children.length > 2) return;

        const isDonor = currentRole === 'donor';
        const isStaff = currentRole === 'staff';
        const isAdmin = currentRole === 'admin';

        // Target: Submit Donation
        if (text === 'submit donation record' || text === 'submit donation') {
          const btn = el.closest('div[style*="background: #B7131A"], div[style*="background:#B7131A"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (path.includes('/submit-donation/')) {
              showToast('Donation record queued for clinical review!', 'success');
              setTimeout(() => { window.location.href = '../donation-history/index.html'; }, 900);
            } else if (isDonor) {
              window.location.href = '../submit-donation/index.html';
            }
          });
        }

        // Target: History & Certificates
        else if (text === 'history & certificates' || text === 'view all history') {
          const btn = el.closest('div[style*="background: white"], div[style*="background:white"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isDonor) window.location.href = '../donation-history/index.html';
          });
        }

        // Target: Donation Drives
        else if (text === 'donation drives' || text === 'explore drives' || text === '+ schedule blood drive') {
          const btn = el.closest('div[style*="border-radius"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.location.href = '../donation-drives/index.html';
          });
        }

        // Target: Pending Reviews (Staff)
        else if (text === 'review pending queue' || text === 'pending reviews') {
          const btn = el.closest('div[style*="border-radius"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isStaff) window.location.href = '../pending-reviews/index.html';
          });
        }

        // Target: Log Walk-In Donation / Donation Records (Staff)
        else if (text === '+ log walk-in donation' || text === 'donation records') {
          const btn = el.closest('div[style*="background: #B7131A"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isStaff) window.location.href = '../donation-records/index.html';
          });
        }

        // Target: Register Hospital / Blood Bank (Admin)
        else if (text === '+ register hospital / blood bank' || text === 'registered facilities') {
          const btn = el.closest('div[style*="border-radius"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isAdmin) window.location.href = '../hospitals-blood-banks/index.html';
          });
        }

        // Target: Profile (Donor or Staff)
        else if (text === 'marcus vance' || text === 'view profile') {
          const btn = el.closest('div[style*="border-radius: 9999px"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isDonor) window.location.href = '../profile/index.html';
          });
        } else if (text === 'dr. aris catadman' || text === 'facility profile') {
          const btn = el.closest('div[style*="border-radius: 9999px"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (isStaff) window.location.href = '../facility-profile/index.html';
          });
        }

        // Target: Cancel or Back
        else if (text === 'cancel' || text === 'cancel slot' || text === 'back to dashboard') {
          const btn = el.closest('div[style*="border-radius"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.location.href = '../dashboard/index.html';
          });
        }

        // Target: Filter / Export
        else if (text === 'export csv' || text === 'filter records') {
          const btn = el.closest('div[style*="border-radius"], div[style*="padding"]') || el;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            showToast(text === 'export csv' ? 'Exporting records to CSV...' : 'Applying status filter...', 'info');
          });
        }
      });
    }

    // Run action wiring
    wirePageActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLifelineSidebar);
  } else {
    initLifelineSidebar();
  }
})();

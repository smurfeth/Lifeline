// js/toast.js — Centered Custom Lifeline UI Toast Notification System

(function initLifelineNotifications() {
  if (document.getElementById('lifeline-toast-styles')) return;

  const style = document.createElement('style');
  style.id = 'lifeline-toast-styles';
  style.textContent = `
    .ll-toast-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      max-width: 500px;
      width: calc(100vw - 40px);
      pointer-events: none;
    }

    .ll-toast {
      pointer-events: auto;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 18px;
      background: #FFFFFF;
      border-radius: 18px;
      padding: 24px 26px;
      box-shadow: 0 24px 54px rgba(15, 23, 42, 0.22), 0 6px 16px rgba(15, 23, 42, 0.10);
      border: 1px solid #E2E8F0;
      border-left: 6px solid #DC2626;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      animation: llPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }

    .ll-toast.is-success {
      border-left-color: #059669;
    }

    .ll-toast.is-error {
      border-left-color: #DC2626;
    }

    .ll-toast.is-info {
      border-left-color: #2563EB;
    }

    .ll-toast-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 20px;
      font-weight: 700;
    }

    .ll-toast.is-success .ll-toast-icon {
      background: #D1FAE5;
      color: #059669;
    }

    .ll-toast.is-error .ll-toast-icon {
      background: #FEE2E2;
      color: #DC2626;
    }

    .ll-toast.is-info .ll-toast-icon {
      background: #DBEAFE;
      color: #2563EB;
    }

    .ll-toast-body {
      flex: 1;
      min-width: 0;
    }

    .ll-toast-title {
      font-family: 'Montserrat', 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 6px 0;
    }

    .ll-toast-msg {
      font-size: 14.5px;
      line-height: 1.5;
      color: #475569;
      margin: 0;
      word-wrap: break-word;
    }

    .ll-toast-close {
      background: none;
      border: none;
      color: #94A3B8;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      align-self: flex-start;
    }

    .ll-toast-close:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    @keyframes llPopIn {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(style);
})();

export function showToast(message, type = 'auto', title = '') {
  let container = document.getElementById('lifeline-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'lifeline-toast-container';
    container.className = 'll-toast-container';
    document.body.appendChild(container);
  }

  const cleanMsg = String(message || '')
    .replace(/\s*in Supabase!?/gi, '.')
    .trim();

  let resolvedType = type;
  if (resolvedType === 'auto') {
    const lower = cleanMsg.toLowerCase();
    if (
      lower.includes('fail') ||
      lower.includes('error') ||
      lower.includes('denied') ||
      lower.includes('invalid') ||
      lower.includes('unauthorized') ||
      lower.includes('required')
    ) {
      resolvedType = 'error';
    } else if (
      lower.includes('success') ||
      lower.includes('updated') ||
      lower.includes('saved') ||
      lower.includes('approved') ||
      lower.includes('completed') ||
      lower.includes('verified')
    ) {
      resolvedType = 'success';
    } else {
      resolvedType = 'info';
    }
  }

  const defaultTitles = {
    success: 'Success',
    error: 'Action Required',
    info: 'Lifeline Notice'
  };

  const icons = {
    success: '✓',
    error: '!',
    info: 'i'
  };

  const toast = document.createElement('div');
  toast.className = `ll-toast is-${resolvedType}`;
  toast.innerHTML = `
    <div class="ll-toast-icon">${icons[resolvedType]}</div>
    <div class="ll-toast-body">
      <div class="ll-toast-title">${title || defaultTitles[resolvedType]}</div>
      <p class="ll-toast-msg">${cleanMsg}</p>
    </div>
    <button type="button" class="ll-toast-close" aria-label="Close notification">&times;</button>
  `;

  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'scale(0.94)';
    setTimeout(() => toast.remove(), 220);
  };

  toast.querySelector('.ll-toast-close').addEventListener('click', removeToast);
  container.appendChild(toast);

  setTimeout(removeToast, 3500);
}

window.alert = (msg) => showToast(msg, 'auto');
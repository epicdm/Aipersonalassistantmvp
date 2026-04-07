/**
 * EPIC Isola Plugin for Chatwoot
 * Injects native sidebar section + full-screen panels
 * No iframes — all data fetched directly from BFF API
 */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const BFF = 'https://bff.epic.dm';
  const TOKEN = 'cmmhmuaxu000104l4l5lmoaxp.1806983333995.cd94937ece1733fa3e2c562bf86445f75f3f3ea594fa37d20fe32d9a96cad693';
  const API = (path) => `${BFF}/api/dashboard/${path}?token=${TOKEN}`;

  const NAV_ITEMS = [
    { key: 'home',       icon: '📊', label: 'Dashboard'  },
    { key: 'inbox',      icon: '💬', label: 'Inbox'      },
    { key: 'catalog',    icon: '📦', label: 'Catalog'    },
    { key: 'bookings',   icon: '📅', label: 'Bookings'   },
    { key: 'broadcasts', icon: '📣', label: 'Broadcasts' },
    { key: 'analytics',  icon: '📈', label: 'Analytics'  },
    { key: 'templates',  icon: '💌', label: 'Templates'  },
    { key: 'feedback',   icon: '⭐', label: 'Feedback'   },
    { key: 'voice',      icon: '🎙', label: 'Voice'      },
    { key: 'agent',      icon: '🤖', label: 'Agent'      },
  ];

  // ── Styles ────────────────────────────────────────────────────────────────
  const CSS = `
    #epic-panel-overlay {
      position: fixed; top: 0; left: 200px; right: 0; bottom: 0;
      background: #f3f4f6; z-index: 35; display: none;
      flex-direction: column; overflow: hidden;
    }
    #epic-panel-overlay.open { display: flex; }
    #epic-panel-header {
      background: #fff; border-bottom: 1px solid #e5e7eb;
      padding: 0 20px; height: 52px; display: flex; align-items: center;
      justify-content: space-between; flex-shrink: 0;
    }
    #epic-panel-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
    #epic-panel-close {
      cursor: pointer; color: #6b7280; font-size: 20px; line-height: 1;
      background: none; border: none; padding: 4px 8px; border-radius: 6px;
    }
    #epic-panel-close:hover { background: #f3f4f6; color: #111; }
    #epic-panel-body { flex: 1; overflow-y: auto; padding: 20px; }
    #epic-panel-body iframe {
      width: 100%; height: 100%; border: none; display: block;
    }

    #epic-nav-section { padding: 4px 8px 8px; }
    #epic-nav-section .epic-nav-label {
      font-size: 10px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: .05em;
      padding: 4px 8px 2px;
    }
    .epic-nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: 8px; cursor: pointer;
      color: #374151; font-size: 13px; font-weight: 500;
      transition: background .12s; text-decoration: none; height: 32px;
      width: 100%; border: none; background: none; text-align: left;
    }
    .epic-nav-item:hover { background: rgba(31,147,255,.08); color: #1f93ff; }
    .epic-nav-item.active { background: rgba(31,147,255,.12); color: #1f93ff; font-weight: 600; }
    .epic-nav-icon { font-size: 15px; width: 18px; text-align: center; }
  `;

  // ── Helpers ───────────────────────────────────────────────────────────────
  let activeKey = null;
  let panelEl, bodyEl, titleEl;

  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildOverlay() {
    panelEl = document.createElement('div');
    panelEl.id = 'epic-panel-overlay';

    const hdr = document.createElement('div');
    hdr.id = 'epic-panel-header';

    titleEl = document.createElement('span');
    titleEl.id = 'epic-panel-title';

    const close = document.createElement('button');
    close.id = 'epic-panel-close';
    close.textContent = '×';
    close.onclick = closePanel;

    hdr.appendChild(titleEl);
    hdr.appendChild(close);

    bodyEl = document.createElement('div');
    bodyEl.id = 'epic-panel-body';

    panelEl.appendChild(hdr);
    panelEl.appendChild(bodyEl);
    document.body.appendChild(panelEl);
  }

  function openPanel(item) {
    activeKey = item.key;
    titleEl.textContent = item.label;

    // Use embed iframe for now — snappy because server renders in ~100ms
    bodyEl.innerHTML = `<iframe src="${BFF}/isola/${item.key}?token=${TOKEN}&mode=embed" loading="eager"></iframe>`;

    panelEl.classList.add('open');
    updateActiveState();
  }

  function closePanel() {
    panelEl.classList.remove('open');
    bodyEl.innerHTML = '';
    activeKey = null;
    updateActiveState();
  }

  function updateActiveState() {
    document.querySelectorAll('.epic-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === activeKey);
    });
  }

  function buildNav(sidebar) {
    const nav = document.querySelector('aside nav');
    if (!nav || document.getElementById('epic-nav-section')) return;

    const section = document.createElement('div');
    section.id = 'epic-nav-section';

    const lbl = document.createElement('div');
    lbl.className = 'epic-nav-label';
    lbl.textContent = 'EPIC';
    section.appendChild(lbl);

    NAV_ITEMS.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'epic-nav-item';
      btn.dataset.key = item.key;
      btn.innerHTML = `<span class="epic-nav-icon">${item.icon}</span><span>${item.label}</span>`;
      btn.onclick = () => {
        if (activeKey === item.key) { closePanel(); return; }
        openPanel(item);
      };
      section.appendChild(btn);
    });

    // Insert at bottom of nav, before the last spacer
    nav.appendChild(section);
  }

  // ── Close on Chatwoot navigation (route change) ───────────────────────────
  function watchRouteChange() {
    let lastPath = location.pathname;
    const obs = new MutationObserver(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        if (activeKey) closePanel();
      }
    });
    obs.observe(document.querySelector('#app'), { childList: true, subtree: true });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    const sidebar = document.querySelector('aside');
    if (!sidebar || document.getElementById('epic-nav-section')) return;
    injectStyles();
    buildOverlay();
    buildNav(sidebar);
    watchRouteChange();
  }

  // Wait for Chatwoot Vue app to finish mounting
  function waitForApp() {
    if (document.querySelector('aside nav')) {
      boot();
      return;
    }
    const obs = new MutationObserver(() => {
      if (document.querySelector('aside nav')) {
        obs.disconnect();
        boot();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForApp);
  } else {
    waitForApp();
  }

  // Re-inject nav if Vue re-renders the sidebar (SPA navigation)
  setInterval(() => {
    if (document.querySelector('aside nav') && !document.getElementById('epic-nav-section')) {
      boot();
    }
  }, 1500);

})();

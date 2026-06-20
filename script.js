document.addEventListener('DOMContentLoaded', () => {

  // --- STORAGE SHIM ---
  const storage = chrome.storage ? chrome.storage.local : {
    get: () => Promise.resolve({}),
    set: () => Promise.resolve()
  };

  // --- DOM REFS ---
  const workspace         = document.getElementById('workspace');
  const shortcutsContainer = document.getElementById('shortcuts-container');
  const addShortcutBtn    = document.getElementById('add-shortcut-btn');
  const configSidebar     = document.getElementById('config-sidebar');
  const shortcutModal     = document.getElementById('shortcut-modal');
  const setting12Hr       = document.getElementById('setting-12hr-clock');
  const settingFooter     = document.getElementById('setting-show-footer');
  const settingLock       = document.getElementById('setting-lock-workspace');

  // --- APP STATE ---
  let localShortcuts = [];
  let userSettings   = { use12Hr: false, showFooter: true, locked: false };
  let editingIndex   = null;
  let layoutMatrix   = {};

  const baseline = {
    volt:     { x: 80,  y: 80,  active: true  },
    clock:    { x: 580, y: 140, active: true  },
    search:   { x: 540, y: 270, active: true  },
    weather:  { x: 930, y: 140, active: false },
    crypto:   { x: 930, y: 250, active: false },
    quote:    { x: 540, y: 380, active: false },
    stats:    { x: 80,  y: 240, active: false },
    pomodoro: { x: 80,  y: 430, active: false },
    notes:    { x: 370, y: 430, active: false }
  };

  // ─── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    await loadSettings();
    await loadShortcuts();
    await loadLayout();

    runClock();
    setInterval(runClock, 1000);

    // Poll RAM only when widget is visible, every 4s
    monitorRAM();
    setInterval(monitorRAM, 4000);

    // Lazy-fetch external data only for active widgets
    if (layoutMatrix.weather && layoutMatrix.weather.active) fetchWeather();
    if (layoutMatrix.crypto  && layoutMatrix.crypto.active)  fetchCrypto();
    if (layoutMatrix.quote   && layoutMatrix.quote.active)   fetchQuote();
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  async function loadSettings() {
    const data = await storage.get(['volt_settings']);
    if (data.volt_settings) userSettings = { ...userSettings, ...data.volt_settings };

    setting12Hr.checked    = userSettings.use12Hr;
    settingFooter.checked  = userSettings.showFooter;
    settingLock.checked    = userSettings.locked;

    applySettings();
  }

  function applySettings() {
    document.getElementById('app-footer').classList.toggle('hidden', !userSettings.showFooter);
    if (userSettings.locked) workspace.classList.add('workspace-locked');
    else workspace.classList.remove('workspace-locked');
  }

  async function saveSettings() {
    userSettings.use12Hr   = setting12Hr.checked;
    userSettings.showFooter = settingFooter.checked;
    userSettings.locked    = settingLock.checked;
    applySettings();
    await storage.set({ volt_settings: userSettings });
    runClock();
  }

  [setting12Hr, settingFooter, settingLock]
    .forEach(el => el.addEventListener('change', saveSettings));

  // ─── SHORTCUTS ────────────────────────────────────────────────────────────
  async function loadShortcuts() {
    const data = await storage.get(['volt_shortcuts']);
    localShortcuts = data.volt_shortcuts || [{ name: 'GitHub', url: 'https://github.com/Dev-Studio95' }];
    renderShortcuts();
  }

  function renderShortcuts() {
    shortcutsContainer.innerHTML = localShortcuts.map((item, i) => {
      let hostname = '';
      try { hostname = new URL(item.url).hostname; } catch (_) {}
      return `<a href="${item.url}" class="shortcut-link" data-index="${i}" title="Right-click to edit">
        <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=32" class="shortcut-icon" alt="">
        <span>${item.name}</span>
      </a>`;
    }).join('');

    document.querySelectorAll('.shortcut-link').forEach(link => {
      link.addEventListener('contextmenu', e => {
        e.preventDefault();
        editingIndex = Number(e.currentTarget.dataset.index);
        document.getElementById('shortcut-modal-title').textContent = 'Edit Shortcut';
        document.getElementById('shortcut-name').value = localShortcuts[editingIndex].name;
        document.getElementById('shortcut-url').value  = localShortcuts[editingIndex].url;
        document.getElementById('modal-delete').classList.remove('hidden');
        shortcutModal.classList.remove('hidden');
      });
    });
  }

  addShortcutBtn.addEventListener('click', () => {
    editingIndex = null;
    document.getElementById('shortcut-modal-title').textContent = 'Add Shortcut';
    document.getElementById('shortcut-name').value = '';
    document.getElementById('shortcut-url').value  = '';
    document.getElementById('modal-delete').classList.add('hidden');
    shortcutModal.classList.remove('hidden');
  });

  document.getElementById('modal-cancel').addEventListener('click', () =>
    shortcutModal.classList.add('hidden'));

  document.getElementById('modal-delete').addEventListener('click', async () => {
    if (editingIndex !== null) {
      localShortcuts.splice(editingIndex, 1);
      await storage.set({ volt_shortcuts: localShortcuts });
      renderShortcuts();
      shortcutModal.classList.add('hidden');
    }
  });

  document.getElementById('modal-save').addEventListener('click', async () => {
    let name = document.getElementById('shortcut-name').value.trim();
    let url  = document.getElementById('shortcut-url').value.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    if (editingIndex !== null) localShortcuts[editingIndex] = { name, url };
    else localShortcuts.push({ name, url });

    await storage.set({ volt_shortcuts: localShortcuts });
    renderShortcuts();
    shortcutModal.classList.add('hidden');
  });

  // ─── LAYOUT ───────────────────────────────────────────────────────────────
  async function loadLayout() {
    const saved = await storage.get(['volt_layout_matrix']);
    layoutMatrix = saved.volt_layout_matrix || JSON.parse(JSON.stringify(baseline));

    // Backfill missing keys from baseline
    for (const key in baseline) {
      if (!layoutMatrix[key]) layoutMatrix[key] = { ...baseline[key] };
    }
    applyLayout();
  }

  function applyLayout() {
    document.querySelectorAll('.draggable-widget').forEach(el => {
      const id = el.dataset.id;
      const state = layoutMatrix[id];
      if (!state) return;

      el.style.left = `${state.x}px`;
      el.style.top  = `${state.y}px`;

      const toggle = document.querySelector(`input.widget-toggle[data-target="${id}"]`);
      if (state.active) {
        el.classList.remove('hidden');
        if (toggle) toggle.checked = true;
      } else {
        el.classList.add('hidden');
        if (toggle) toggle.checked = false;
      }
    });
    clampWidgets();
  }

  function clampWidgets() {
    document.querySelectorAll('.draggable-widget:not(.hidden)').forEach(el => {
      const id = el.dataset.id;
      let x = parseInt(el.style.left, 10) || layoutMatrix[id].x;
      let y = parseInt(el.style.top,  10) || layoutMatrix[id].y;
      x = Math.max(0, Math.min(x, window.innerWidth  - el.offsetWidth));
      y = Math.max(50, Math.min(y, window.innerHeight - el.offsetHeight));
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
      layoutMatrix[id].x = x;
      layoutMatrix[id].y = y;
    });
  }
  window.addEventListener('resize', clampWidgets);

  // Widget toggle checkboxes
  document.querySelectorAll('input.widget-toggle').forEach(t => {
    t.addEventListener('change', async e => {
      const id = e.target.dataset.target;
      const widget = document.getElementById(`widget-${id}`);
      const isActive = e.target.checked;

      widget.classList.toggle('hidden', !isActive);
      layoutMatrix[id].active = isActive;
      await storage.set({ volt_layout_matrix: layoutMatrix });

      if (isActive) {
        clampWidgets();
        // Fetch data when widget is first enabled
        if (id === 'weather') fetchWeather();
        if (id === 'crypto')  fetchCrypto();
        if (id === 'quote')   fetchQuote();
      }
    });
  });

  // Reset layout
  document.getElementById('reset-layout-btn').addEventListener('click', async () => {
    layoutMatrix = JSON.parse(JSON.stringify(baseline));
    await storage.set({ volt_layout_matrix: layoutMatrix });
    applyLayout();
  });

  // Sidebar open/close
  document.getElementById('sidebar-toggle').addEventListener('click', () =>
    configSidebar.classList.remove('hidden-sidebar'));
  document.getElementById('close-sidebar-btn').addEventListener('click', () =>
    configSidebar.classList.add('hidden-sidebar'));

  // ─── SIMPLE DRAG (no collision engine) ────────────────────────────────────
  let dragTarget = null, offX = 0, offY = 0;

  workspace.addEventListener('mousedown', e => {
    if (userSettings.locked) return;
    const widget = e.target.closest('.draggable-widget');
    if (widget && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
      dragTarget = widget;
      const rect = widget.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      widget.style.zIndex = '999';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', e => {
    if (!dragTarget) return;
    const x = Math.max(0, Math.min(e.clientX - offX, window.innerWidth  - dragTarget.offsetWidth));
    const y = Math.max(50, Math.min(e.clientY - offY, window.innerHeight - dragTarget.offsetHeight));
    dragTarget.style.left = `${x}px`;
    dragTarget.style.top  = `${y}px`;
  });

  document.addEventListener('mouseup', async () => {
    if (!dragTarget) return;
    dragTarget.style.zIndex = '10';
    const id = dragTarget.dataset.id;
    layoutMatrix[id].x = parseInt(dragTarget.style.left, 10);
    layoutMatrix[id].y = parseInt(dragTarget.style.top,  10);
    await storage.set({ volt_layout_matrix: layoutMatrix });
    dragTarget = null;
  });

  // ─── CLOCK ────────────────────────────────────────────────────────────────
  const dClock = document.getElementById('digital-clock');
  const amPm   = document.getElementById('am-pm-indicator');

  function runClock() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    if (userSettings.use12Hr) {
      amPm.textContent = h >= 12 ? 'PM' : 'AM';
      amPm.classList.remove('hidden');
      h = h % 12 || 12;
    } else {
      amPm.classList.add('hidden');
    }
    dClock.textContent = `${String(h).padStart(2, '0')}:${m}`;
  }

  // ─── DATA FETCHERS ────────────────────────────────────────────────────────
  async function fetchWeather() {
    try {
      const r = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=22.8&longitude=86.18&current_weather=true'
      );
      const d = await r.json();
      document.getElementById('weather-temp').textContent =
        `${d.current_weather.temperature}\u00b0C`;
    } catch (_) {}
  }

  async function fetchCrypto() {
    try {
      const r = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      );
      const d = await r.json();
      document.getElementById('crypto-price').textContent =
        `$${d.bitcoin.usd.toLocaleString()}`;
    } catch (_) {}
  }

  async function fetchQuote() {
    try {
      const r = await fetch('https://dummyjson.com/quotes/random');
      const d = await r.json();
      document.getElementById('quote-text').textContent   = `\u201c${d.quote}\u201d`;
      document.getElementById('quote-author').textContent = `- ${d.author}`;
    } catch (_) {}
  }

  // ─── RAM MONITOR (4s poll, only if widget active) ─────────────────────────
  function monitorRAM() {
    if (!layoutMatrix.stats || !layoutMatrix.stats.active) return;
    if (chrome.system && chrome.system.memory) {
      chrome.system.memory.getInfo(info => {
        const total = info.capacity;
        const used  = total - info.availableCapacity;
        const pct   = (used / total) * 100;
        document.getElementById('ram-text').textContent =
          `${(used / 1024 ** 3).toFixed(1)} / ${(total / 1024 ** 3).toFixed(0)} GB`;
        document.getElementById('ram-bar').style.width = `${pct}%`;
      });
    }
  }

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href =
        `https://www.google.com/search?q=${encodeURIComponent(e.target.value.trim())}`;
    }
  });

  // ─── NOTES (autosave on blur) ─────────────────────────────────────────────
  const notesTA = document.getElementById('notes-textarea');
  storage.get(['volt_notes']).then(d => {
    if (d.volt_notes) notesTA.value = d.volt_notes;
  });
  notesTA.addEventListener('blur', () =>
    storage.set({ volt_notes: notesTA.value }));

  // ─── POMODORO ─────────────────────────────────────────────────────────────
  let pomoDuration = 25 * 60, pomoRemaining = pomoDuration;
  let pomoTimer = null, pomoRunning = false;
  const pomoDisplay = document.getElementById('pomodoro-display');
  const pomoStart   = document.getElementById('pomo-start');
  const pomoReset   = document.getElementById('pomo-reset');

  function renderPomo() {
    const m = String(Math.floor(pomoRemaining / 60)).padStart(2, '0');
    const s = String(pomoRemaining % 60).padStart(2, '0');
    pomoDisplay.textContent = `${m}:${s}`;
  }

  pomoStart.addEventListener('click', () => {
    if (pomoRunning) {
      clearInterval(pomoTimer);
      pomoRunning = false;
      pomoStart.textContent = 'Start';
    } else {
      pomoRunning = true;
      pomoStart.textContent = 'Pause';
      pomoTimer = setInterval(() => {
        if (pomoRemaining > 0) {
          pomoRemaining--;
          renderPomo();
        } else {
          clearInterval(pomoTimer);
          pomoRunning = false;
          pomoStart.textContent = 'Start';
          pomoRemaining = pomoDuration;
          renderPomo();
        }
      }, 1000);
    }
  });

  pomoReset.addEventListener('click', () => {
    clearInterval(pomoTimer);
    pomoRunning = false;
    pomoStart.textContent = 'Start';
    pomoRemaining = pomoDuration;
    renderPomo();
  });

  // ─── BOOT ─────────────────────────────────────────────────────────────────
  init();
});

// theme.js — toggles data-theme on <html> and persists choice
(function () {
  const KEY = 'kc_theme_v1';
  const btn = document.getElementById('themeToggle');
  const root = document.documentElement;

  function getStored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) { return null; }
  }

  function store(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
  }

  function applyTheme(name) {
    if (name === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function init() {
    const stored = getStored();
    if (stored) {
      applyTheme(stored);
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
      store(prefersLight ? 'light' : 'dark');
    }

    if (btn) {
      btn.addEventListener('click', () => {
        const current = getStored() === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        store(next);
        btn.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
        btn.textContent = next === 'light' ? 'Light' : 'Dark';
      });

      const label = getStored() === 'light' ? 'Light' : 'Dark';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', label === 'Light' ? 'true' : 'false');
    }

    console.log('Theme initialized:', getStored());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

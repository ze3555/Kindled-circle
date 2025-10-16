// js/theme.js — robust theme toggle with safe DOM access and logs
(function () {
  const KEY = 'kc_theme_v1';
  const root = document.documentElement;

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function applyTheme(name) {
    if (name === 'light') {
      root.setAttribute('data-theme', 'light');
      console.info('[theme] applied light');
    } else {
      root.removeAttribute('data-theme');
      console.info('[theme] applied dark');
    }
  }

  function initTheme() {
    const stored = safeGet(KEY);
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      const initial = prefersLight ? 'light' : 'dark';
      applyTheme(initial);
      safeSet(KEY, initial);
    }
  }

  function initButton() {
    const button = document.getElementById('themeToggle');
    if (!button) {
      console.warn('[theme] themeToggle button not found in DOM');
      return;
    }

    // initial label according to storage
    const currentLabel = safeGet(KEY) === 'light' ? 'Light' : 'Dark';
    button.textContent = currentLabel;
    button.setAttribute('aria-pressed', currentLabel === 'Light' ? 'true' : 'false');

    button.addEventListener('click', () => {
      const now = safeGet(KEY) === 'light' ? 'light' : 'dark';
      const next = now === 'light' ? 'dark' : 'light';
      applyTheme(next);
      safeSet(KEY, next);
      button.textContent = next === 'light' ? 'Light' : 'Dark';
      button.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
      console.log('[theme] toggled to', next);
    });
  }

  function ready() {
    try {
      initTheme();
      initButton();
      console.log('[theme] initialized, current:', safeGet(KEY));
    } catch (err) {
      console.error('[theme] failed to init', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();

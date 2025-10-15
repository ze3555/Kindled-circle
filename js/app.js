// app.js — minimal behavior: guides list, add guide prompt, clear local data
document.addEventListener('DOMContentLoaded', () => {
  console.log('Kindled Circle: app loaded');

  const guidesKey = 'kc_guides_v1';
  const guidesListEl = document.getElementById('guidesList');
  const addGuideBtn = document.getElementById('addGuide');
  const clearBtn = document.getElementById('clearLocal');

  function loadGuides() {
    const raw = localStorage.getItem(guidesKey);
    if (!raw) {
      guidesListEl.innerHTML = `<p class="muted">No guides yet. Add the first one.</p>`;
      return [];
    }
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) {
        guidesListEl.innerHTML = `<p class="muted">No guides yet. Add the first one.</p>`;
        return [];
      }
      guidesListEl.innerHTML = '';
      arr.forEach((g, i) => {
        const node = document.createElement('div');
        node.className = 'guide-item';
        node.style.padding = '10px 0';
        node.innerHTML = `<strong>${escapeHtml(g.title)}</strong><div style="color:var(--muted);font-size:0.95rem;margin-top:6px">${escapeHtml(g.content)}</div>`;
        guidesListEl.appendChild(node);
      });
      return arr;
    } catch (e) {
      console.warn('Failed to parse guides', e);
      guidesListEl.innerHTML = `<p class="muted">No guides yet. Add the first one.</p>`;
      return [];
    }
  }

  function saveGuides(arr) {
    localStorage.setItem(guidesKey, JSON.stringify(arr));
    loadGuides();
  }

  function addGuide() {
    const title = prompt('Guide title (short):');
    if (!title) return;
    const content = prompt('Guide content (short):') || '';
    const arr = loadGuides();
    arr.unshift({ title: title.trim(), content: content.trim() });
    saveGuides(arr);
  }

  function clearLocal() {
    if (!confirm('Clear local data (guides)? This cannot be undone locally.')) return;
    localStorage.removeItem(guidesKey);
    loadGuides();
  }

  addGuideBtn?.addEventListener('click', addGuide);
  clearBtn?.addEventListener('click', clearLocal);

  // initial render
  loadGuides();

  // small helper
  function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c]));
  }
});

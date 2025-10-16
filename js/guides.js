// js/guides.js
// ES module — frontend for Guides: search games -> open articles -> swipe blocks
// Usage: dynamic import('/js/guides.js').then(m => m.init());

const API_BASE = '/api'; // поменяй на свой бек-URL при необходимости
const STORAGE_KEY = 'kc_guides_offline_v1';

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from((ctx || document).querySelectorAll(sel)); }

export async function init() {
  // If already initialized, no-op
  if (window.__kc_guides_inited) return;
  window.__kc_guides_inited = true;

  // Attach to existing navlink if present
  const trigger = document.querySelector('.navlink[data-module="guides"]') || document.querySelector('.navlink[href="#guides"]');
  if (trigger) {
    trigger.addEventListener('click', async (e) => {
      e.preventDefault();
      await openGuidesModal();
    });
  } else {
    // if no button found, open immediately (debug)
    // await openGuidesModal();
  }
}

// ---------- UI builders ----------
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'kc-guides-modal';
  modal.innerHTML = `
    <div class="kc-modal-backdrop" data-action="close"></div>
    <div class="kc-modal-panel" role="dialog" aria-modal="true" aria-label="Guides">
      <header class="kc-modal-header">
        <div class="kc-search-row">
          <input class="kc-search-input" placeholder="Search game..." aria-label="Search game" />
          <button class="kc-btn kc-btn-primary kc-search-btn">Search</button>
        </div>
        <div class="kc-actions">
          <button class="kc-btn kc-add-btn">Add</button>
          <button class="kc-btn kc-close-btn" aria-label="Close">✕</button>
        </div>
      </header>

      <main class="kc-modal-body">
        <div class="kc-results" aria-live="polite"></div>
        <div class="kc-articles hidden"></div>
        <div class="kc-article-view hidden"></div>
      </main>

      <footer class="kc-modal-footer">
        <small class="muted">Guides — editable blocks. Swipe to navigate.</small>
      </footer>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

// ---------- Helpers for API/fallback ----------
async function apiGet(path) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('bad');
    return await r.json();
  } catch (e) {
    // network error -> return null to signal fallback
    return null;
  }
}

async function apiPost(path, body) {
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('bad');
    return await r.json();
  } catch (e) {
    return null;
  }
}

function loadOffline() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { games: [], articles: {} };
  } catch { return { games: [], articles: {} }; }
}
function saveOffline(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ---------- Main flow ----------
async function openGuidesModal() {
  const modal = createModal();
  const input = qs('.kc-search-input', modal);
  const searchBtn = qs('.kc-search-btn', modal);
  const resultsEl = qs('.kc-results', modal);
  const articlesEl = qs('.kc-articles', modal);
  const articleView = qs('.kc-article-view', modal);
  const addBtn = qs('.kc-add-btn', modal);
  const closeBtn = qs('.kc-close-btn', modal);
  const backdrop = qs('.kc-modal-backdrop', modal);

  // state
  let offline = loadOffline();

  // Close handlers
  function closeModal() {
    modal.remove();
    // remove touchmove prevention
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', esc);
    }
  });

  // Prevent body scroll while modal open
  document.body.style.overflow = 'hidden';

  // Search logic
  async function doSearch(q) {
    resultsEl.innerHTML = `<div class="kc-loading">Searching…</div>`;
    // Try backend: GET /api/games?query=...
    const res = await apiGet(`/games?query=${encodeURIComponent(q)}`);
    if (res && Array.isArray(res.games)) {
      renderGames(res.games);
    } else {
      // fallback: search offline
      const matches = offline.games.filter(g => (g.title || '').toLowerCase().includes(q.toLowerCase()));
      renderGames(matches, true);
    }
  }

  function renderGames(games = [], offlineMode = false) {
    if (!games.length) {
      resultsEl.innerHTML = `<div class="kc-empty">No games found.</div>`;
      return;
    }
    resultsEl.innerHTML = '';
    games.forEach(g => {
      const row = document.createElement('div');
      row.className = 'kc-game-row';
      row.innerHTML = `
        <div class="kc-game-info">
          <div class="kc-game-title">${escapeHtml(g.title)}</div>
          <div class="kc-game-meta muted">${g.subtitle || ''}</div>
        </div>
        <div class="kc-game-actions">
          <button class="kc-btn kc-open-game" data-id="${g.id}" data-title="${escapeHtml(g.title)}">Open</button>
        </div>
      `;
      resultsEl.appendChild(row);
    });

    // attach opens
    qsa('.kc-open-game', resultsEl).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        await openGameArticles(id, title);
      });
    });
  }

  // Open game articles list
  async function openGameArticles(gameId, gameTitle) {
    resultsEl.classList.add('hidden');
    articlesEl.classList.remove('hidden');
    articleView.classList.add('hidden');
    articlesEl.innerHTML = `<div class="kc-loading">Loading articles for ${escapeHtml(gameTitle)}…</div>`;

    // try backend: GET /api/games/{id}/articles
    const res = await apiGet(`/games/${encodeURIComponent(gameId)}/articles`);
    let articles;
    if (res && Array.isArray(res.articles)) {
      articles = res.articles;
      // cache offline
      offline.articles = offline.articles || {};
      offline.articles[gameId] = articles;
      saveOffline(offline);
    } else {
      // fallback offline
      articles = (offline.articles && offline.articles[gameId]) || [];
    }

    renderArticlesList(gameId, gameTitle, articles);
  }

  function renderArticlesList(gameId, gameTitle, articles = []) {
    articlesEl.innerHTML = `
      <div class="kc-articles-header">
        <button class="kc-btn kc-back-to-games">← Back</button>
        <h3>${escapeHtml(gameTitle)}</h3>
      </div>
      <div class="kc-articles-list"></div>
    `;
    const list = qs('.kc-articles-list', articlesEl);
    if (!articles.length) {
      list.innerHTML = `<div class="kc-empty">No articles yet. Click Add to create one.</div>`;
    } else {
      articles.forEach((a, idx) => {
        const el = document.createElement('div');
        el.className = 'kc-article-row';
        el.innerHTML = `<div class="kc-article-title">${escapeHtml(a.title)}</div>
                        <div class="kc-article-meta muted">${a.summary || ''}</div>
                        <div class="kc-article-actions"><button class="kc-btn kc-open-article" data-index="${idx}">Open</button></div>`;
        list.appendChild(el);
      });

      // open article handlers
      qsa('.kc-open-article', list).forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          openArticleView(gameId, articles[idx], articles, idx);
        });
      });
    }

    qs('.kc-back-to-games', articlesEl).addEventListener('click', () => {
      articlesEl.classList.add('hidden');
      resultsEl.classList.remove('hidden');
    });
  }

  // Article view: supports swipe between blocks (blocks array: {type:'text'|'image', content:...})
  function openArticleView(gameId, article, articlesArr = [], articleIndex = 0) {
    articlesEl.classList.add('hidden');
    articleView.classList.remove('hidden');
    articleView.innerHTML = `
      <div class="kc-article-header">
        <button class="kc-btn kc-back-to-articles">← Back</button>
        <h3>${escapeHtml(article.title)}</h3>
      </div>
      <div class="kc-article-slider" aria-live="polite"></div>
      <div class="kc-article-controls">
        <button class="kc-btn kc-prev">Prev</button>
        <button class="kc-btn kc-next">Next</button>
        <button class="kc-btn kc-edit">Edit</button>
        <button class="kc-btn kc-delete">Delete</button>
      </div>
    `;
    const slider = qs('.kc-article-slider', articleView);
    const blocks = article.blocks || [];
    let current = 0;

    // render blocks
    function renderBlocks() {
      slider.innerHTML = '';
      if (!blocks.length) {
        slider.innerHTML = '<div class="kc-empty">No blocks yet. Add content.</div>';
        return;
      }
      blocks.forEach((b, idx) => {
        const node = document.createElement('div');
        node.className = 'kc-block';
        if (b.type === 'image') {
          node.innerHTML = `<img src="${escapeAttr(b.src)}" alt="${escapeHtml(b.alt||'')}" />`;
        } else {
          node.innerHTML = `<div class="kc-block-text">${escapeHtml(b.text||'')}</div>`;
        }
        node.style.transform = `translateX(${(idx - current) * 100}%)`;
        slider.appendChild(node);
      });
    }

    // swipe handlers (touch + mouse)
    let startX = 0, currentX = 0, dragging = false;
    function pointerDown(x) { startX = x; dragging = true; }
    function pointerMove(x) { if (!dragging) return; currentX = x; const dx = currentX - startX; slider.style.transform = `translateX(${dx}px)`; }
    function pointerUp() {
      if (!dragging) return; dragging = false;
      const dx = currentX - startX;
      const threshold = 60;
      if (dx < -threshold && current < blocks.length - 1) {
        current++;
      } else if (dx > threshold && current > 0) {
        current--;
      }
      updatePositions();
    }

    function updatePositions() {
      qsa('.kc-block', slider).forEach((n, idx) => {
        n.style.transition = 'transform 260ms ease';
        n.style.transform = `translateX(${(idx - current) * 100}%)`;
        setTimeout(() => n.style.transition = '', 280);
      });
    }

    // attach pointer events
    slider.addEventListener('touchstart', e => pointerDown(e.touches[0].clientX));
    slider.addEventListener('touchmove', e => pointerMove(e.touches[0].clientX));
    slider.addEventListener('touchend', pointerUp);
    slider.addEventListener('mousedown', e => pointerDown(e.clientX));
    window.addEventListener('mousemove', e => pointerMove(e.clientX));
    window.addEventListener('mouseup', pointerUp);

    // Controls
    qs('.kc-prev', articleView).addEventListener('click', () => { if (current>0) { current--; updatePositions(); }});
    qs('.kc-next', articleView).addEventListener('click', () => { if (current<blocks.length-1) { current++; updatePositions(); }});
    qs('.kc-back-to-articles', articleView).addEventListener('click', () => {
      articleView.classList.add('hidden');
      articlesEl.classList.remove('hidden');
    });

    qs('.kc-edit', articleView).addEventListener('click', () => openEditArticleModal(gameId, article, articlesArr));
    qs('.kc-delete', articleView).addEventListener('click', async () => {
      if (!confirm('Delete this article?')) return;
      // try API delete
      const res = await apiPost(`/games/${encodeURIComponent(gameId)}/articles/${encodeURIComponent(article.id)}/delete`, {});
      if (res && res.ok) {
        // refresh list by removing locally
        articlesArr.splice(articleIndex,1);
        // update offline
        offline.articles[gameId] = articlesArr;
        saveOffline(offline);
        alert('Deleted');
        articleView.classList.add('hidden');
        renderArticlesList(gameId, article.title, articlesArr);
      } else {
        // fallback: remove from offline
        if (offline.articles && offline.articles[gameId]) {
          offline.articles[gameId].splice(articleIndex,1);
          saveOffline(offline);
          alert('Deleted (offline)');
          articleView.classList.add('hidden');
          renderArticlesList(gameId, article.title, offline.articles[gameId]);
        } else {
          alert('Delete failed');
        }
      }
    });

    renderBlocks();
    updatePositions();
  }

  // Add new article (modal)
  function openEditArticleModal(gameId, article = null, articlesArr = []) {
    const em = document.createElement('div');
    em.className = 'kc-edit-modal';
    em.innerHTML = `
      <div class="kc-edit-panel">
        <h3>${article ? 'Edit' : 'Create'} article</h3>
        <label>Title <input class="kc-input-title" value="${escapeAttr(article ? article.title : '')}" /></label>
        <label>Summary <input class="kc-input-summary" value="${escapeAttr(article ? article.summary : '')}" /></label>
        <div class="kc-edit-blocks"></div>
        <div style="margin-top:12px;">
          <button class="kc-btn kc-save">Save</button>
          <button class="kc-btn kc-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(em);
    const saveBtn = qs('.kc-save', em);
    const cancelBtn = qs('.kc-cancel', em);

    cancelBtn.addEventListener('click', () => em.remove());
    saveBtn.addEventListener('click', async () => {
      const title = qs('.kc-input-title', em).value.trim();
      const summary = qs('.kc-input-summary', em).value.trim();
      if (!title) return alert('Title required');
      const payload = { title, summary, blocks: article ? (article.blocks||[]) : [] };

      const res = await apiPost(`/games/${encodeURIComponent(gameId)}/articles${article ? '/' + encodeURIComponent(article.id) : ''}`, payload);
      if (res && res.ok) {
        // server returned success and new article (res.article)
        offline.articles[gameId] = offline.articles[gameId] || [];
        if (article) {
          // find and replace
          const idx = offline.articles[gameId].findIndex(a => a.id === article.id);
          if (idx !== -1) offline.articles[gameId][idx] = res.article;
        } else {
          offline.articles[gameId].push(res.article);
        }
        saveOffline(offline);
        alert('Saved');
        em.remove();
        renderArticlesList(gameId, title, offline.articles[gameId]);
      } else {
        // fallback: save locally with generated id
        const newid = 'local-' + Date.now();
        const art = { id: newid, title, summary: summary, blocks: [] };
        offline.articles[gameId] = offline.articles[gameId] || [];
        if (article) {
          const idx = offline.articles[gameId].findIndex(a => a.id === article.id);
          if (idx !== -1) offline.articles[gameId][idx] = art;
        } else offline.articles[gameId].push(art);
        saveOffline(offline);
        alert('Saved offline');
        em.remove();
        renderArticlesList(gameId, title, offline.articles[gameId]);
      }
    });
  }

  // Add button opens game creation (if no game selected, prompt for game)
  addBtn.addEventListener('click', () => {
    // create new game quickly
    const gtitle = prompt('Game title:');
    if (!gtitle) return;
    const gid = 'localgame-' + Date.now();
    const newGame = { id: gid, title: gtitle, subtitle: '' };
    offline.games.push(newGame);
    saveOffline(offline);
    renderGames(offline.games, true);
  });

  // Search button handler
  searchBtn.addEventListener('click', () => {
    const q = input.value.trim();
    if (!q) return;
    doSearch(q);
  });
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });

  // initial: show offline games if any
  if (offline.games && offline.games.length) renderGames(offline.games, true);
  else resultsEl.innerHTML = `<div class="kc-hint">Type game name to search</div>`;
}

// ---------- small utils ----------
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s = '') {
  return String(s).replace(/"/g, '&quot;');
}

// If the module is loaded directly via <script type="module">, auto init
if (typeof document !== 'undefined') {
  const attach = () => {
    // If nav already wired to lazy-load, do nothing; otherwise attach a click for safe fallback
    const trigger = document.querySelector('.navlink[data-module="guides"]') || document.querySelector('.navlink[href="#guides"]');
    if (trigger) {
      trigger.addEventListener('click', async (e) => {
        e.preventDefault();
        // ensure init runs
        if (typeof init === 'function') await init();
        // open modal if init did not do it automatically (init attaches its own)
      }, { once: true });
    }
  };
  // run after DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
}

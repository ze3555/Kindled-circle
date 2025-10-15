// Simple prototype: poll + guides stored in localStorage
const LS_GUIDES = 'embers_guides_v2';
const LS_POLL = 'embers_poll_v2';
const POLL_KEY_VOTED = 'embers_poll_voted';

// Poll options
const POLL_OPTIONS = [
  { id: 'yes', label: 'Yes — make the site' },
  { id: 'no', label: 'No' },
  { id: 'joke', label: "I'm gay" }
];

// Utilities
const $ = (sel) => document.querySelector(sel);
const create = (tag, props = {}) => Object.assign(document.createElement(tag), props);

// Storage helpers
function loadGuides(){ try { return JSON.parse(localStorage.getItem(LS_GUIDES)) || []; } catch(e){ return []; } }
function saveGuides(list){ localStorage.setItem(LS_GUIDES, JSON.stringify(list)); }

function loadPoll(){ try { return JSON.parse(localStorage.getItem(LS_POLL)) || { votes: { yes:0, no:0, joke:0 } }; } catch(e){ return { votes: { yes:0, no:0, joke:0 } }; } }
function savePoll(p){ localStorage.setItem(LS_POLL, JSON.stringify(p)); }

// Render poll
function renderPoll(){
  const state = loadPoll();
  const container = $('#poll-options');
  container.innerHTML = '';
  const total = Object.values(state.votes).reduce((s,n)=>s+n,0);
  POLL_OPTIONS.forEach(opt=>{
    const count = state.votes[opt.id] || 0;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    const row = create('div', { className: 'poll-option' });
    row.innerHTML = `
      <div class="left">
        <strong>${opt.label}</strong>
        <div class="poll-bar" aria-hidden="true">
          <div class="poll-fill" style="width:${percent}%"></div>
        </div>
      </div>
      <div>
        <span title="${count} votes">${percent}%</span>
        <button data-id="${opt.id}" class="btn" style="margin-left:8px">Vote</button>
      </div>
    `;
    container.appendChild(row);
  });
  $('#poll-total').textContent = `${total} votes`;

  container.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if(localStorage.getItem(POLL_KEY_VOTED)){
        alert('You already voted in this browser. To test again, reset poll or clear local data.');
        return;
      }
      const state = loadPoll();
      state.votes[id] = (state.votes[id] || 0) + 1;
      savePoll(state);
      localStorage.setItem(POLL_KEY_VOTED, Date.now().toString());
      renderPoll();
    };
  });
}

// Reset poll (admin convenience)
$('#reset-poll').addEventListener('click', () => {
  if(!confirm('Reset poll votes? This clears votes for everyone in this browser.')) return;
  localStorage.removeItem(LS_POLL);
  localStorage.removeItem(POLL_KEY_VOTED);
  renderPoll();
});

// Guides UI
function renderGuides(){
  const list = loadGuides();
  const container = $('#guides-list');
  container.innerHTML = '';
  if(list.length === 0){
    container.innerHTML = `<p class="muted">No guides yet. Add the first one.</p>`;
    return;
  }
  list.slice().reverse().forEach(item => {
    const el = create('div', { className: 'guide' });
    el.innerHTML = `<h4>${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.content)}</p>
                    <small>Author: ${escapeHtml(item.author || 'anonymous')} • ${new Date(item.created).toLocaleString()}</small>`;
    container.appendChild(el);
  });
}

function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// Add guide form
$('#guide-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    title: f.title.value.trim(),
    content: f.content.value.trim(),
    author: f.author.value.trim(),
    created: Date.now()
  };
  if(!data.title || !data.content){ alert('Title and content are required.'); return; }
  const list = loadGuides();
  list.push(data);
  saveGuides(list);
  f.reset();
  renderGuides();
});

// Add sample guide
$('#import-sample').addEventListener('click', () => {
  const sample = {
    title: 'Sample: Best starting weapons for caster-parry build',
    content: 'Quick tips: use light shield with parry frames, estoc works well for thrusts; level int/fai to 30 for spells and buffs. This is a short example guide — replace with your content.',
    author: 'community',
    created: Date.now()
  };
  const list = loadGuides();
  list.push(sample);
  saveGuides(list);
  renderGuides();
});

// Clear all local data (convenience)
$('#clear-storage').addEventListener('click', () => {
  if(!confirm('Clear all local data (guides + poll + votes)?')) return;
  localStorage.removeItem(LS_GUIDES);
  localStorage.removeItem(LS_POLL);
  localStorage.removeItem(POLL_KEY_VOTED);
  renderGuides();
  renderPoll();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderPoll();
  renderGuides();
});
